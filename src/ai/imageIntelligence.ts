// SCIP Image Intelligence Engine
// Pure TypeScript image metadata extraction (EXIF, format, dimensions)
// with optional Python vision service integration for OCR/object detection.
// No external image dependencies required.

import {
  ImageAnalysis,
  ImageExif,
  ImageMetadata,
  ImageUploadResult,
  ImageSource
} from '../types/scip.js';
import { aiAdapter } from './aiServiceAdapter.js';

const nowIso = (): string => new Date().toISOString();

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB (matches express json limit)

/** Detect image format from magic bytes. */
export function detectFormat(buffer: Buffer | Uint8Array): 'jpeg' | 'png' | 'webp' | 'gif' | 'unknown' {
  if (buffer.length < 2) return 'unknown';
  const b0 = buffer[0];
  const b1 = buffer[1];
  // JPEG: FF D8 (SOI) — 2-byte magic is sufficient
  if (b0 === 0xff && b1 === 0xd8) return 'jpeg';
  if (buffer.length < 4) return 'unknown';
  const b2 = buffer[2];
  const b3 = buffer[3];
  if (b2 === 0xff) return 'jpeg'; // confirm JPEG with segment marker
  if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) return 'png';
  if (b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46) {
    // WEBP: RIFF....WEBP
    if (buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return 'webp';
    }
    return 'unknown';
  }
  if (b0 === 0x47 && b1 === 0x49 && b2 === 0x46 && b3 === 0x38) return 'gif';
  return 'unknown';
}

/** Read unsigned 16-bit big/little endian (works on Buffer and Uint8Array). */
function readU16(buf: Buffer | Uint8Array, offset: number, littleEndian: boolean): number {
  const b0 = buf[offset]!;
  const b1 = buf[offset + 1]!;
  return littleEndian ? (b1 << 8) | b0 : (b0 << 8) | b1;
}

/** Read unsigned 32-bit big/little endian (works on Buffer and Uint8Array). */
function readU32(buf: Buffer | Uint8Array, offset: number, littleEndian: boolean): number {
  const b0 = buf[offset]!;
  const b1 = buf[offset + 1]!;
  const b2 = buf[offset + 2]!;
  const b3 = buf[offset + 3]!;
  if (littleEndian) return ((b3 << 24) | (b2 << 16) | (b1 << 8) | b0) >>> 0;
  return ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
}

/** Read a rational (two U32) and return as number. */
function readRational(buf: Buffer | Uint8Array, offset: number, littleEndian: boolean): number {
  const num = readU32(buf, offset, littleEndian);
  const den = readU32(buf, offset + 4, littleEndian);
  if (den === 0) return 0;
  return num / den;
}

/** Read an ASCII string from buffer at offset for count bytes. */
function readAscii(buf: Buffer | Uint8Array, offset: number, count: number): string {
  const bytes = buf.subarray(offset, offset + count);
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s.trim();
}

/** Convert GPS degrees/minutes/seconds (3 rationals) + ref to decimal degrees. */
function gpsToDecimal(
  buf: Buffer | Uint8Array,
  offset: number,
  littleEndian: boolean,
  refBuf: Buffer | Uint8Array | undefined,
  refOffset: number,
  refLength: number,
  ref: string
): number | undefined {
  if (!refBuf) return undefined;
  const d = readRational(buf, offset, littleEndian);
  const m = readRational(buf, offset + 8, littleEndian);
  const s = readRational(buf, offset + 16, littleEndian);
  let decimal = d + m / 60 + s / 3600;
  const refStr = readAscii(refBuf, refOffset, refLength);
  if (refStr === 'S' || refStr === 'W') decimal = -decimal;
  return Number(decimal.toFixed(6));
}

/** Parse JPEG EXIF segment (APP1) into ImageExif. */
function parseJpegExif(buffer: Buffer | Uint8Array): ImageExif | undefined {
  // Find APP1 marker (0xFFE1) with Exif\0\0 header
  let pos = 2; // skip SOI
  while (pos < buffer.length - 4) {
    if (buffer[pos] === 0xff && buffer[pos + 1] === 0xe1) {
      const segLen = readU16(buffer, pos + 2, false);
      const exifStart = pos + 4;
      if (exifStart + 6 > buffer.length) break;
      // Check "Exif\0\0"
      if (
        buffer[exifStart] === 0x45 && buffer[exifStart + 1] === 0x78 &&
        buffer[exifStart + 2] === 0x69 && buffer[exifStart + 3] === 0x66 &&
        buffer[exifStart + 4] === 0 && buffer[exifStart + 5] === 0
      ) {
        const tiffStart = exifStart + 6;
        return parseTiff(buffer, tiffStart, segLen - 6);
      }
    }
    // Skip to next marker: read segment length
    const segLen = readU16(buffer, pos + 2, false);
    pos += 2 + segLen;
  }
  return undefined;
}

/** Parse TIFF structure (IFD0 + optional Exif/GPS sub-IFDs). */
function parseTiff(buffer: Buffer | Uint8Array, tiffStart: number, available: number): ImageExif | undefined {
  if (tiffStart + 8 > buffer.length) return undefined;
  const byteOrderMarker = readAscii(buffer, tiffStart, 2);
  const littleEndian = byteOrderMarker === 'II';
  if (byteOrderMarker !== 'II' && byteOrderMarker !== 'MM') return undefined;

  const magic = readU16(buffer, tiffStart + 2, littleEndian);
  if (magic !== 42) return undefined;

  const ifd0Offset = readU32(buffer, tiffStart + 4, littleEndian);
  const ifd0Abs = tiffStart + ifd0Offset;
  if (ifd0Abs + 2 > buffer.length) return undefined;

  const exif: ImageExif = {};

  // IFD0 entries
  const numEntries = readU16(buffer, ifd0Abs, littleEndian);
  let exifIfdPtr: number | undefined;
  let gpsIfdPtr: number | undefined;

  for (let i = 0; i < Math.min(numEntries, 50); i++) {
    const entryOffset = ifd0Abs + 2 + i * 12;
    if (entryOffset + 12 > buffer.length) break;
    const tag = readU16(buffer, entryOffset, littleEndian);
    const type = readU16(buffer, entryOffset + 2, littleEndian);
    const count = readU32(buffer, entryOffset + 4, littleEndian);
    const valueOffset = readU32(buffer, entryOffset + 8, littleEndian);

    const getAscii = (): string | undefined => {
      const abs = tiffStart + valueOffset;
      if (abs + count > buffer.length) return undefined;
      return readAscii(buffer, abs, count);
    };

    const getRational = (idxOffset: number): number | undefined => {
      const abs = tiffStart + idxOffset;
      if (abs + 8 > buffer.length) return undefined;
      return readRational(buffer, abs, littleEndian);
    };

    switch (tag) {
      case 0x010f: // Make
        exif.make = getAscii(); break;
      case 0x0110: // Model
        exif.model = getAscii(); break;
      case 0x0131: // Software
        exif.software = getAscii(); break;
      case 0x0132: // DateTime
        if (!exif.datetimeOriginal) exif.datetimeOriginal = getAscii(); break;
      case 0x8769: // Exif IFD pointer
        exifIfdPtr = valueOffset; break;
      case 0x8825: // GPS IFD pointer
        gpsIfdPtr = valueOffset; break;
      case 0x0101: // ImageWidth (IFD0)
        exif.width = type === 3 || type === 4 ? readU16(buffer, entryOffset + 8, littleEndian) : undefined; break;
      case 0x0102: // ImageLength
        exif.height = type === 3 || type === 4 ? readU16(buffer, entryOffset + 8, littleEndian) : undefined; break;
    }
  }

  // Exif sub-IFD
  if (exifIfdPtr !== undefined) {
    const exifIfdAbs = tiffStart + exifIfdPtr;
    if (exifIfdAbs + 2 < buffer.length) {
      const numExifEntries = readU16(buffer, exifIfdAbs, littleEndian);
      for (let i = 0; i < Math.min(numExifEntries, 50); i++) {
        const entryOffset = exifIfdAbs + 2 + i * 12;
        if (entryOffset + 12 > buffer.length) break;
        const tag = readU16(buffer, entryOffset, littleEndian);
        const type = readU16(buffer, entryOffset + 2, littleEndian);
        const count = readU32(buffer, entryOffset + 4, littleEndian);
        const valueOffset = readU32(buffer, entryOffset + 8, littleEndian);

        if (tag === 0x9003 && !exif.datetimeOriginal) {
          // DateTimeOriginal - ASCII string inline or offset
          const abs = tiffStart + valueOffset;
          if (abs + count <= buffer.length) {
            exif.datetimeOriginal = readAscii(buffer, abs, count);
          }
        }
      }
    }
  }

  // GPS sub-IFD
  if (gpsIfdPtr !== undefined) {
    const gpsIfdAbs = tiffStart + gpsIfdPtr;
    if (gpsIfdAbs + 2 < buffer.length) {
      const numGpsEntries = readU16(buffer, gpsIfdAbs, littleEndian);
      let latOffset: number | undefined;
      let lngOffset: number | undefined;
      let altOffset: number | undefined;
      let latRefBuf: Buffer | Uint8Array | undefined;
      let lngRefBuf: Buffer | Uint8Array | undefined;
      let latRefOffset = 0;
      let lngRefOffset = 0;

      for (let i = 0; i < Math.min(numGpsEntries, 50); i++) {
        const entryOffset = gpsIfdAbs + 2 + i * 12;
        if (entryOffset + 12 > buffer.length) break;
        const tag = readU16(buffer, entryOffset, littleEndian);
        const count = readU32(buffer, entryOffset + 4, littleEndian);
        const valueOffset = readU32(buffer, entryOffset + 8, littleEndian);
        const abs = tiffStart + valueOffset;

        switch (tag) {
          case 0x0001: // GPSLatitudeRef
            latRefBuf = buffer.subarray(abs, abs + count);
            latRefOffset = abs; break;
          case 0x0002: // GPSLatitude
            latOffset = valueOffset; break;
          case 0x0003: // GPSLongitudeRef
            lngRefBuf = buffer.subarray(abs, abs + count);
            lngRefOffset = abs; break;
          case 0x0004: // GPSLongitude
            lngOffset = valueOffset; break;
          case 0x0006: // GPSAltitude
            altOffset = valueOffset; break;
        }
      }

      if (latOffset !== undefined && latRefBuf) {
        const val = gpsToDecimal(buffer, tiffStart + latOffset, littleEndian, latRefBuf, latRefOffset, latRefBuf.length, 'lat');
        if (val !== undefined) exif.gpsLatitude = val;
      }
      if (lngOffset !== undefined && lngRefBuf) {
        const val = gpsToDecimal(buffer, tiffStart + lngOffset, littleEndian, lngRefBuf, lngRefOffset, lngRefBuf.length, 'lng');
        if (val !== undefined) exif.gpsLongitude = val;
      }
      if (altOffset !== undefined) {
        exif.gpsAltitude = readRational(buffer, tiffStart + altOffset, littleEndian);
      }
    }
  }

  // Orientation is in IFD0 tag 0x0112 - re-scan quickly
  for (let i = 0; i < Math.min(numEntries, 50); i++) {
    const entryOffset = ifd0Abs + 2 + i * 12;
    if (entryOffset + 12 > buffer.length) break;
    const tag = readU16(buffer, entryOffset, littleEndian);
    const type = readU16(buffer, entryOffset + 2, littleEndian);
    if (tag === 0x0112 && type === 3) {
      exif.orientation = readU16(buffer, entryOffset + 8, littleEndian);
    }
  }

  return exif;
}

/** Extract JPEG dimensions from SOF marker if not in EXIF. */
function getJpegDimensions(buffer: Buffer | Uint8Array): { width?: number; height?: number } {
  let pos = 2;
  while (pos < buffer.length - 4) {
    if (buffer[pos] === 0xff) {
      const marker = buffer[pos + 1];
      // SOF0 (0xC0) to SOF15 (0xCF), excluding 0xC4, 0xC8, 0xCC
      if ((marker & 0xf0) === 0xc0 && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        if (pos + 7 > buffer.length) break;
        const height = readU16(buffer, pos + 5, false);
        const width = readU16(buffer, pos + 7, false);
        return { width, height };
      }
      // Skip segment
      const segLen = readU16(buffer, pos + 2, false);
      pos += 2 + segLen;
    } else {
      break;
    }
  }
  return {};
}

/** Extract PNG dimensions from IHDR chunk. */
function getPngDimensions(buffer: Buffer | Uint8Array): { width?: number; height?: number } {
  if (buffer.length < 24) return {};
  // IHDR at offset 8: length(4) + type(4 "IHDR") + width(4) + height(4)
  const width = readU32(buffer, 16, false);
  const height = readU32(buffer, 20, false);
  if (width > 0 && height > 0 && width < 100000 && height < 100000) {
    return { width, height };
  }
  return {};
}

/** Extract metadata from a raw image buffer. */
export function extractImageMetadata(buffer: Buffer | Uint8Array, source: ImageSource, uploadedBy?: string): ImageMetadata {
  const imageId = `IMG-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const format = detectFormat(buffer);
  let mimeType = 'application/octet-stream';
  switch (format) {
    case 'jpeg': mimeType = 'image/jpeg'; break;
    case 'png': mimeType = 'image/png'; break;
    case 'webp': mimeType = 'image/webp'; break;
    case 'gif': mimeType = 'image/gif'; break;
    default: mimeType = 'application/octet-stream'; break;
  }

  const metadata: ImageMetadata = {
    imageId,
    source,
    format,
    mimeType,
    sizeBytes: buffer.length,
    uploadedAt: nowIso(),
    uploadedBy
  };

  if (format === 'jpeg') {
    const exif = parseJpegExif(buffer);
    if (exif) {
      metadata.exif = exif;
      if (exif.width) metadata.width = exif.width;
      if (exif.height) metadata.height = exif.height;
    }
    if (!metadata.width || !metadata.height) {
      const dims = getJpegDimensions(buffer);
      if (dims.width) metadata.width = dims.width;
      if (dims.height) metadata.height = dims.height;
    }
  } else if (format === 'png') {
    const dims = getPngDimensions(buffer);
    if (dims.width) metadata.width = dims.width;
    if (dims.height) metadata.height = dims.height;
  }

  return metadata;
}

/** Parse a base64 data URL into a Buffer. */
export function parseDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return null;
  const mimeType = match[1];
  const base64 = match[2];
  try {
    const buffer = Buffer.from(base64, 'base64');
    return { buffer, mimeType };
  } catch {
    return null;
  }
}

/** Basic heuristic analysis: check for text-like content indicators and damage keywords. */
function heuristicAnalysis(buffer: Buffer | Uint8Array, format: string, description?: string): {
  detectedObjects: string[];
  sceneLabels: string[];
  hasText: boolean;
  hasDamage: boolean;
  confidence: number;
} {
  const detectedObjects: string[] = [];
  const sceneLabels: string[] = [];
  let hasText = false;
  let hasDamage = false;

  // Scene hints from filename/description keywords
  const text = (description || '').toLowerCase();
  const damageKeywords = ['crack', 'collapse', 'damage', 'broken', 'fallen', 'pothole', 'sparking', 'overflow', 'clogged'];
  for (const kw of damageKeywords) {
    if (text.includes(kw)) { hasDamage = true; break; }
  }

  const objectKeywords = ['tree', 'branch', 'pole', 'transformer', 'drain', 'pipe', 'bin', 'lamp', 'sign', 'wall', 'bridge', 'road', 'building'];
  for (const kw of objectKeywords) {
    if (text.includes(kw)) detectedObjects.push(kw);
  }

  const sceneKeywords = ['market', 'street', 'road', 'park', 'school', 'hospital', 'residential', 'commercial', 'industrial', 'canal', 'plaza'];
  for (const kw of sceneKeywords) {
    if (text.includes(kw)) sceneLabels.push(kw);
  }

  // Format-based heuristic: larger PNGs/JPEGs more likely to contain readable content
  if (format === 'png' || format === 'jpeg') hasText = text.length > 0;

  const confidence = detectedObjects.length > 0 || sceneLabels.length > 0 ? 0.6 : 0.3;

  return {
    detectedObjects,
    sceneLabels,
    hasText,
    hasDamage,
    confidence
  };
}

/** Analyze an image buffer. Optionally calls Python service for OCR. */
export async function analyzeImage(
  buffer: Buffer | Uint8Array,
  metadata: ImageMetadata,
  description?: string
): Promise<ImageAnalysis> {
  const imageId = metadata.imageId;

  // Try the Python vision service through the adapter (gated by AI_SERVICE_ENABLED,
  // with the standard timeout). Returns null when disabled, unreachable, or unsupported.
  const data = await aiAdapter.analyzeImage({
    imageId,
    imageBase64: buffer.toString('base64'),
    mimeType: metadata.mimeType
  });
  if (data) {
    return {
      imageId,
      ocrText: data.ocr_text,
      detectedObjects: Array.isArray(data.detected_objects) ? data.detected_objects : [],
      sceneLabels: Array.isArray(data.scene_labels) ? data.scene_labels : [],
      hasText: Boolean(data.has_text),
      hasDamage: Boolean(data.has_damage),
      confidence: Number(data.confidence) || 0.7,
      modelVersion: data.model_version || 'scip-python-vision-v1.0',
      analyzedAt: nowIso()
    };
  }

  const heuristic = heuristicAnalysis(buffer, metadata.format, description);
  return {
    imageId,
    ocrText: undefined,
    detectedObjects: heuristic.detectedObjects,
    sceneLabels: heuristic.sceneLabels,
    hasText: heuristic.hasText,
    hasDamage: heuristic.hasDamage,
    confidence: heuristic.confidence,
    modelVersion: 'scip-local-heuristic-v1.0',
    analyzedAt: nowIso()
  };
}

/** Full pipeline: parse data URL -> extract metadata -> analyze. */
export async function processImageUpload(
  dataUrl: string,
  source: ImageSource,
  uploadedBy?: string,
  description?: string
): Promise<ImageUploadResult> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    throw new Error('Invalid image data URL. Expected format: data:<mime>;base64,<data>');
  }

  const { buffer, mimeType } = parsed;
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`Image exceeds maximum size of ${MAX_IMAGE_BYTES / 1024 / 1024}MB`);
  }

  const metadata = extractImageMetadata(buffer, source, uploadedBy);
  // Override mimeType from data URL if more specific
  if (mimeType && mimeType !== 'application/octet-stream') {
    metadata.mimeType = mimeType;
  }

  const analysis = await analyzeImage(buffer, metadata, description);

  const url = `/api/image/${metadata.imageId}`;
  return {
    imageId: metadata.imageId,
    url,
    metadata,
    analysis
  };
}

export const imageEngine = {
  detectFormat,
  extractImageMetadata,
  parseDataUrl,
  analyzeImage,
  processImageUpload
};
