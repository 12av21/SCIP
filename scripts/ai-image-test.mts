// SCIP Image Intelligence Test Suite
// Tests image format detection, EXIF parsing, metadata extraction, data URL parsing, and analysis.

import {
  detectFormat,
  extractImageMetadata,
  parseDataUrl,
  processImageUpload,
  analyzeImage,
  imageEngine
} from '../src/ai/imageIntelligence.js';
import {
  ImageMetadata,
  ImageAnalysis,
  ImageSource
} from '../types/scip.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.log(`  FAIL: ${message}`);
  }
}

// ------------------------------------------------------------------
// Test fixtures: minimal valid image buffers
// ------------------------------------------------------------------

// Minimal JPEG: SOI + APP1(Exif, 0 entries) + SOF0(16x32) + EOI
const jpegBuffer = new Uint8Array([
  0xff, 0xd8,                                              // SOI
  0xff, 0xe1, 0x00, 0x12,                                  // APP1, length=18 (2 len + 16 data)
  0x45, 0x78, 0x69, 0x66, 0x00, 0x00,                      // "Exif\0\0"
  0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,          // TIFF II, magic 42, IFD0 off=8
  0x00, 0x00,                                              // IFD0: 0 entries
  0xff, 0xc0, 0x00, 0x11, 0x08,                            // SOF0, precision 8
  0x00, 0x10, 0x00, 0x20,                                  // height=16, width=32
  0x01, 0x01, 0x11, 0x00,                                  // 1 component
  0xff, 0xd9                                               // EOI
]);

// Minimal PNG: signature + IHDR(16x32)
const pngBuffer = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,          // signature
  0x00, 0x00, 0x00, 0x0d,                                  // IHDR length 13
  0x49, 0x48, 0x44, 0x52,                                  // "IHDR"
  0x00, 0x00, 0x00, 0x10,                                  // width=16
  0x00, 0x00, 0x00, 0x20,                                  // height=32
  0x08, 0x02, 0x00, 0x00, 0x00,                            // bit depth, color, compression, filter, interlace
  0x00, 0x00, 0x00, 0x00                                   // CRC (placeholder)
]);

const jpegBase64 = Buffer.from(jpegBuffer).toString('base64');
const pngBase64 = Buffer.from(pngBuffer).toString('base64');
const jpegDataUrl = `data:image/jpeg;base64,${jpegBase64}`;
const pngDataUrl = `data:image/png;base64,${pngBase64}`;

// ------------------------------------------------------------------
// TEST 1: Format Detection
// ------------------------------------------------------------------
console.log('\n=== TEST 1: Format Detection ===');

assert(detectFormat(jpegBuffer) === 'jpeg', 'JPEG buffer detected as jpeg');
assert(detectFormat(pngBuffer) === 'png', 'PNG buffer detected as png');

const webpBuffer = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
assert(detectFormat(webpBuffer) === 'webp', 'WEBP buffer detected as webp');

const gifBuffer = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
assert(detectFormat(gifBuffer) === 'gif', 'GIF buffer detected as gif');

const unknownBuffer = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
assert(detectFormat(unknownBuffer) === 'unknown', 'Unknown buffer detected as unknown');
assert(detectFormat(new Uint8Array([0xff, 0xd8])) === 'jpeg', 'Short JPEG prefix still jpeg');
assert(detectFormat(new Uint8Array([0x89, 0x50])) === 'unknown', 'Short PNG prefix (incomplete) is unknown');

// ------------------------------------------------------------------
// TEST 2: Data URL Parsing
// ------------------------------------------------------------------
console.log('\n=== TEST 2: Data URL Parsing ===');

const parsedJpeg = parseDataUrl(jpegDataUrl);
assert(parsedJpeg !== null, 'Valid JPEG data URL parses');
if (parsedJpeg) {
  assert(parsedJpeg.mimeType === 'image/jpeg', 'Parsed MIME type is image/jpeg');
  assert(parsedJpeg.buffer.length === jpegBuffer.length, 'Parsed buffer length matches');
}

const parsedPng = parseDataUrl(pngDataUrl);
assert(parsedPng !== null, 'Valid PNG data URL parses');
if (parsedPng) {
  assert(parsedPng.mimeType === 'image/png', 'Parsed MIME type is image/png');
}

assert(parseDataUrl('not-a-data-url') === null, 'Invalid data URL returns null');
assert(parseDataUrl('data:text/plain,hello') === null, 'Non-base64 data URL returns null');
assert(parseDataUrl('') === null, 'Empty string returns null');

// ------------------------------------------------------------------
// TEST 3: Metadata Extraction
// ------------------------------------------------------------------
console.log('\n=== TEST 3: Metadata Extraction ===');

const jpegMeta = extractImageMetadata(jpegBuffer, 'upload', 'USR-CIT-01');
assert(jpegMeta.imageId.startsWith('IMG-'), 'JPEG imageId starts with IMG-');
assert(jpegMeta.source === 'upload', 'JPEG source is upload');
assert(jpegMeta.format === 'jpeg', 'JPEG format is jpeg');
assert(jpegMeta.mimeType === 'image/jpeg', 'JPEG mimeType is image/jpeg');
assert(jpegMeta.sizeBytes === jpegBuffer.length, 'JPEG sizeBytes matches');
assert(jpegMeta.width === 32, `JPEG width is 32 (got ${jpegMeta.width})`);
assert(jpegMeta.height === 16, `JPEG height is 16 (got ${jpegMeta.height})`);
assert(jpegMeta.uploadedBy === 'USR-CIT-01', 'JPEG uploadedBy is set');
assert(typeof jpegMeta.uploadedAt === 'string', 'JPEG uploadedAt is a string');

const pngMeta = extractImageMetadata(pngBuffer, 'camera');
assert(pngMeta.format === 'png', 'PNG format is png');
assert(pngMeta.mimeType === 'image/png', 'PNG mimeType is image/png');
assert(pngMeta.width === 16, `PNG width is 16 (got ${pngMeta.width})`);
assert(pngMeta.height === 32, `PNG height is 32 (got ${pngMeta.height})`);
assert(pngMeta.source === 'camera', 'PNG source is camera');

// ------------------------------------------------------------------
// TEST 4: Process Image Upload
// ------------------------------------------------------------------
console.log('\n=== TEST 4: Process Image Upload ===');

const result = await processImageUpload(jpegDataUrl, 'upload', 'USR-CIT-01', 'Flooded street photo');
assert(result.imageId.startsWith('IMG-'), 'Upload result has imageId');
assert(result.url === `/api/image/${result.imageId}`, 'Upload result URL matches');
assert(result.metadata.format === 'jpeg', 'Upload metadata format is jpeg');
assert(result.metadata.sizeBytes === jpegBuffer.length, 'Upload metadata size matches');
assert(result.metadata.uploadedBy === 'USR-CIT-01', 'Upload metadata uploadedBy set');
assert(result.analysis !== undefined, 'Upload includes analysis');
assert(result.analysis!.imageId === result.imageId, 'Analysis imageId matches');
assert(typeof result.analysis!.confidence === 'number' && result.analysis!.confidence >= 0 && result.analysis!.confidence <= 1, 'Analysis confidence in [0,1]');
assert(Array.isArray(result.analysis!.detectedObjects), 'Analysis detectedObjects is array');
assert(Array.isArray(result.analysis!.sceneLabels), 'Analysis sceneLabels is array');

// Invalid data URL throws
try {
  await processImageUpload('not-a-data-url', 'upload');
  assert(false, 'Invalid data URL should throw');
} catch (e) {
  assert(true, 'Invalid data URL throws error');
}

// Oversized image throws
const bigBase64 = 'A'.repeat(11 * 1024 * 1024 * 4 / 3); // ~11MB base64
try {
  await processImageUpload(`data:image/jpeg;base64,${bigBase64}`, 'upload');
  assert(false, 'Oversized image should throw');
} catch (e) {
  assert(true, 'Oversized image throws error');
}

// ------------------------------------------------------------------
// TEST 5: Analyze Image (heuristic)
// ------------------------------------------------------------------
console.log('\n=== TEST 5: Analyze Image (heuristic) ===');

const heuristicAnalysis = await analyzeImage(jpegBuffer, jpegMeta, 'Pothole on road near school');
assert(heuristicAnalysis.imageId === jpegMeta.imageId, 'Analysis imageId matches');
assert(Array.isArray(heuristicAnalysis.detectedObjects), 'Analysis has detectedObjects');
assert(Array.isArray(heuristicAnalysis.sceneLabels), 'Analysis has sceneLabels');
assert(typeof heuristicAnalysis.hasText === 'boolean', 'Analysis hasText is boolean');
assert(typeof heuristicAnalysis.hasDamage === 'boolean', 'Analysis hasDamage is boolean');
assert(typeof heuristicAnalysis.confidence === 'number', 'Analysis confidence is number');
assert(heuristicAnalysis.confidence >= 0 && heuristicAnalysis.confidence <= 1, 'Analysis confidence in [0,1]');
assert(typeof heuristicAnalysis.modelVersion === 'string', 'Analysis modelVersion is string');
assert(typeof heuristicAnalysis.analyzedAt === 'string', 'Analysis analyzedAt is string');

// Damage keyword detection
const damageAnalysis = await analyzeImage(jpegBuffer, jpegMeta, 'Sparking transformer wire danger');
assert(damageAnalysis.hasDamage === true, 'Damage keyword detected (sparking)');

// No damage
const safeAnalysis = await analyzeImage(jpegBuffer, jpegMeta, 'Clean street view');
assert(safeAnalysis.hasDamage === false, 'No damage keyword');

// ------------------------------------------------------------------
// TEST 6: Image Engine Exports
// ------------------------------------------------------------------
console.log('\n=== TEST 6: Image Engine Exports ===');

assert(typeof imageEngine.detectFormat === 'function', 'imageEngine.detectFormat is function');
assert(typeof imageEngine.extractImageMetadata === 'function', 'imageEngine.extractImageMetadata is function');
assert(typeof imageEngine.parseDataUrl === 'function', 'imageEngine.parseDataUrl is function');
assert(typeof imageEngine.analyzeImage === 'function', 'imageEngine.analyzeImage is function');
assert(typeof imageEngine.processImageUpload === 'function', 'imageEngine.processImageUpload is function');

// ------------------------------------------------------------------
// TEST 7: Types
// ------------------------------------------------------------------
console.log('\n=== TEST 7: Type Shape ===');

const meta: ImageMetadata = jpegMeta;
assert(meta.format === 'jpeg', 'Type conformance: ImageMetadata.format');
const analysis: ImageAnalysis = result.analysis!;
assert(analysis.confidence >= 0, 'Type conformance: ImageAnalysis.confidence');
const src: ImageSource = 'camera';
assert(src === 'camera', 'Type conformance: ImageSource');

// ------------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`IMAGE INTELLIGENCE TEST SUMMARY`);
console.log(`========================================`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
