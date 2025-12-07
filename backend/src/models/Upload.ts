import { Date, Document, model, Schema } from "mongoose";

interface IUpload extends Document {
    userId: string;
    originalName: string;
    storageKey: string;
    gigaFileId: string;
    size: number;
    uploadedAt: Date;
    mimeType: string;
}

const uploadSchema = new Schema<IUpload>({
  userId: { type: String, required: true },
  originalName: { type: String, required: true },
  storageKey: { type: String, required: true },
  gigaFileId: { type: String, default: null },
  size: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
  mimeType: { type: String, required: true }
});

export const Upload = model<IUpload>('Upload', uploadSchema);