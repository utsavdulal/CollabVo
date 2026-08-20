import { Router } from 'express';
import { storage } from '../../config/azureBlob.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';

const router = Router();

const serveFile = asyncHandler(async (req, res) => {
  const blobPath = req.params.blobPath;
  if (!blobPath || blobPath.includes('..') || blobPath.includes('\\') || blobPath.startsWith('/')) {
    throw new ApiError(400, 'Invalid file path');
  }
  const url = await storage.signedUrl(blobPath, 300);
  if (!url) throw new ApiError(404, 'File not found');
  res.redirect(url);
});

router.get('/files/:blobPath(*)', serveFile);
router.get('/api/file/:blobPath(*)', serveFile);

export default router;
