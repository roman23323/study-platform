import { Document, model, Schema, Types } from "mongoose";

interface ILesson extends Document {
  uploadId: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
}

const lessonSchema = new Schema<ILesson>({
  uploadId: { type: Schema.Types.ObjectId, required: true, index: true },
  content: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: null },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

export const LessonModel = model<ILesson>('Lesson', lessonSchema);