import { Upload } from '../models/Upload';
import { uploadFileToGigaChat } from '../services/aiService';

export async function ensureFileInGigaChat(uploadId: string): Promise<string> {
  const upload = await Upload.findById(uploadId);
  if (!upload) throw new Error('Upload not found');

  if (upload.gigaFileId) {
    return upload.gigaFileId;
  }

  const file_id = await uploadFileToGigaChat(uploadId);

  upload.gigaFileId = file_id;
  await upload.save();

  return file_id;
}