import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, isAbsolute, join } from 'path';

const DEFAULT_UPLOAD_SUBDIR = 'uploads';
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

// Sadece kabul edilen image MIME tipleri. Her yeni tip eklenirken buraya dahil edilmeli.
const ALLOWED_MIME_TYPES = new Set<string>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

// MIME -> uzantı eşlemesi. Client'tan gelen uzantıya güvenmemek için.
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

const SAFE_EXT_PATTERN = /^\.[a-z0-9]{1,5}$/;

/** Absolute uploads dizini. `UPLOAD_DIR` env'i set edilmişse onu kullanır. */
export function resolveUploadDir(): string {
  const raw = process.env.UPLOAD_DIR?.trim();
  if (raw) {
    return isAbsolute(raw) ? raw : join(process.cwd(), raw);
  }
  return join(process.cwd(), DEFAULT_UPLOAD_SUBDIR);
}

function pickExtension(originalName: string, mimeType: string): string {
  const mimeExt = MIME_TO_EXT[mimeType];
  if (mimeExt) {
    return mimeExt;
  }
  const fromName = extname(originalName || '').toLowerCase();
  if (fromName && SAFE_EXT_PATTERN.test(fromName)) {
    return fromName;
  }
  return '.bin';
}

export const imageUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = resolveUploadDir();
      try {
        mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
        cb(null, uploadDir);
      } catch (err) {
        cb(err as Error, uploadDir);
      }
    },
    filename: (_req, file, cb) => {
      const ext = pickExtension(file.originalname, file.mimetype);
      cb(null, `${Date.now()}-${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
      return;
    }
    cb(null, true);
  },
};
