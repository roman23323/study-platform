import { Router } from "express";
import multer, { memoryStorage } from "multer";
import { Upload } from "../models/Upload";
import { authenticateToken } from "./middlewares/authMiddleware";
import { deleteFileFromBucket, getDownloadUrl, uploadFileToBucket } from "../services/storage";
import { Types } from "mongoose";

const fileRouter = Router();

const upload = multer({
  storage: memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Only PDF, DOCX, PPTX allowed.'));
    }
  },
});

fileRouter.post(
    '/',
    authenticateToken,
    upload.single('file'),
    async (req, res) => {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file provided' });

        try {
            const userId = req.user?.userId;
            
            const cleanName = file.originalname
                .replace(/\s+/g, '_')
                .replace(/[^a-zA-Z0-9._-]/g, '');
            const key = `users/${userId}/${Date.now()}-${cleanName}`;

            const storageKey = await uploadFileToBucket(file.buffer, key, file.mimetype);

            const uploadRecord = new Upload({
                userId,
                originalName: file.originalname,
                storageKey,
                size: file.size,
                mimeType: file.mimetype
            });

            await uploadRecord.save();

            const downloadUrl = await getDownloadUrl(storageKey, 3600);

            res.status(201).json({
                id: uploadRecord._id,
                originalName: file.originalname,
                size: file.size,
                mimeType: file.mimetype,
                downloadUrl, // клиент может сразу скачать
            });
        } catch (e) {
            res.status(500).json({ error: (e as Error).message });
        }
});

fileRouter.delete(
  '/:id',
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!Types.ObjectId.isValid(id || '')) {
      return res.status(400).json({ error: 'Invalid upload ID format' });
    }

    try {
      const uploadRecord = await Upload.findById(id);
      if (!uploadRecord) {
        return res.status(404).json({ error: 'Upload record not found' });
      }

      if (uploadRecord.userId.toString() !== userId) {
        return res.status(403).json({ error: 'Access denied: upload does not belong to user' });
      }

      await deleteFileFromBucket(uploadRecord.storageKey);

      await Upload.findByIdAndDelete(id);

      res.status(204).send();
    } catch (e) {
      console.error('Delete file error:', e);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  }
);

export default fileRouter;