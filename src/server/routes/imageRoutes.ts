// SCIP Backend - Image Intelligence Routes
// Endpoints: /api/image/*
// Image upload, metadata extraction (EXIF), and analysis for civic report evidence.
// Images are accepted as base64 data URLs in JSON (no multipart dependency).

import { Router, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../../database/index.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import {
  processImageUpload,
  extractImageMetadata,
  parseDataUrl,
  analyzeImage,
  detectFormat
} from '../../ai/imageIntelligence.js';
import { ImageMetadata, ImageSource } from '../../types/scip.js';

const router = Router();

// In-memory image store (dev/local). Buffers are also written to uploads/ directory.
// Note: uploaded images are not persisted across server restarts unless written to disk.
const imageStore = new Map<string, { buffer: Buffer; metadata: ImageMetadata; analysis?: any }>();

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
function ensureUploadDir(): void {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  } catch {
    // Disk writes are optional; in-memory store remains available.
  }
}

function storeImage(imageId: string, buffer: Buffer, metadata: ImageMetadata): void {
  imageStore.set(imageId, { buffer, metadata });
  try {
    ensureUploadDir();
    fs.writeFileSync(path.join(UPLOAD_DIR, `${imageId}.bin`), buffer);
    fs.writeFileSync(
      path.join(UPLOAD_DIR, `${imageId}.meta.json`),
      JSON.stringify(metadata, null, 2)
    );
  } catch {
    // Disk write failure is non-fatal; in-memory store is authoritative for this session.
  }
}

// POST /api/image/upload — accept base64 data URL, extract metadata, run analysis
router.post('/upload', authenticate, requirePermission('image.upload'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { dataUrl, source = 'upload', description } = req.body || {};
    if (typeof dataUrl !== 'string' || !dataUrl) {
      res.status(400).json({ success: false, message: 'dataUrl (base64 image) is required.', errors: ['Missing dataUrl.'] });
      return;
    }

    const uploadedBy = req.user?.id;
    const result = await processImageUpload(dataUrl, source as ImageSource, uploadedBy, description);

    // Persist buffer + metadata for later retrieval/serve
    const parsed = parseDataUrl(dataUrl);
    if (parsed) {
      storeImage(result.imageId, parsed.buffer, result.metadata);
    }

    await db.logAudit({
      action: 'REPORT_CREATED', // closest existing action; image upload is report evidence
      module: 'reports',
      recordId: result.imageId,
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      ipAddress: req.ip || '127.0.0.1',
      details: `Image uploaded: ${result.metadata.format} ${result.metadata.sizeBytes} bytes`
    });

    res.status(201).json({ success: true, message: 'Image uploaded and analyzed.', data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Upload failed.' : err.message, errors: [err.message] });
  }
});

// GET /api/image/metadata/:id — retrieve stored image metadata
router.get('/metadata/:id', authenticate, requirePermission('image.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stored = imageStore.get(req.params.id);
    if (!stored) {
      res.status(404).json({ success: false, message: 'Image not found.', errors: ['Image not found.'] });
      return;
    }
    res.json({ success: true, data: stored.metadata });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve image metadata.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// POST /api/image/analyze — run image analysis on a stored image or new data URL
router.post('/analyze', authenticate, requirePermission('image.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { imageId, dataUrl, description } = req.body || {};
    let metadata: ImageMetadata;
    let buffer: Buffer;

    if (imageId) {
      const stored = imageStore.get(imageId);
      if (!stored) {
        res.status(404).json({ success: false, message: 'Stored image not found.', errors: ['Image not found.'] });
        return;
      }
      buffer = stored.buffer;
      metadata = stored.metadata;
    } else if (dataUrl) {
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) {
        res.status(400).json({ success: false, message: 'Invalid dataUrl.', errors: ['Invalid dataUrl.'] });
        return;
      }
      if (parsed.buffer.length > 10 * 1024 * 1024) {
        res.status(400).json({ success: false, message: 'Image exceeds maximum size.', errors: ['Image too large.'] });
        return;
      }
      buffer = parsed.buffer;
      metadata = extractImageMetadata(buffer, 'upload', req.user?.id);
      if (parsed.mimeType && parsed.mimeType !== 'application/octet-stream') {
        metadata.mimeType = parsed.mimeType;
      }
      storeImage(metadata.imageId, parsed.buffer, metadata);
    } else {
      res.status(400).json({ success: false, message: 'imageId or dataUrl is required.', errors: ['Missing image reference.'] });
      return;
    }

    const analysis = await analyzeImage(buffer, metadata, description);
    if (imageId) {
      const stored = imageStore.get(imageId);
      if (stored) stored.analysis = analysis;
    }

    res.json({ success: true, data: { imageId, metadata, analysis } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Image analysis failed.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// GET /api/image/:id — serve stored image buffer
router.get('/:id', authenticate, requirePermission('image.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stored = imageStore.get(req.params.id);
    if (!stored) {
      res.status(404).json({ success: false, message: 'Image not found.', errors: ['Image not found.'] });
      return;
    }
    res.setHeader('Content-Type', stored.metadata.mimeType);
    res.setHeader('Content-Length', String(stored.buffer.length));
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(stored.buffer);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to serve image.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

export default router;
