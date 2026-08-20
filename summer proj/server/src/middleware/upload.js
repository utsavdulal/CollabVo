import multer from 'multer';
import path from 'path';
import { ApiError } from './error.js';

const ALLOWED_MIME = new Map([
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/pdf', 'pdf']
]);

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPG, PNG, WEBP or PDF files are allowed'));
    }
    cb(null, true);
  }
});

export function validateUploadedFiles(files, { imagesOnly = false } = {}) {
  if (!files || files.length === 0) {
    throw new ApiError(400, 'No files uploaded');
  }
  for (const f of files) {
    if (!ALLOWED_MIME.has(f.mimetype)) {
      throw new ApiError(400, `Unsupported file type: ${f.mimetype}`);
    }
    if (imagesOnly && f.mimetype === 'application/pdf') {
      throw new ApiError(400, 'Images only for this upload');
    }
  }
}
