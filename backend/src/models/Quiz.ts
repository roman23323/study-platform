import { model, Schema, Types } from "mongoose";

// TODO: указать этот интефрейс при парсинге квиза в generateQuiz
export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number; // 0–3
}

export interface Quiz {
  questions: QuizQuestion[];
  uploadId: Types.ObjectId;
  createdAt: Date;
}

const QuizQuestionSchema = new Schema({
  question: { type: String, required: true, trim: true },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (v: string[]) => Array.isArray(v) && v.length === 4,
      message: 'Each question must have exactly 4 options',
    },
  },
  correctIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
    validate: {
      validator: Number.isInteger,
      message: 'correctIndex must be an integer between 0 and 3',
    },
  },
}, { _id: false });

const QuizSchema = new Schema<Quiz>({
  uploadId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  questions: {
    type: [QuizQuestionSchema],
    required: true,
    validate: {
      validator: (v: any[]) => Array.isArray(v) && v.length === 3,
      message: 'Quiz must contain exactly 3 questions'
    }
  },
  createdAt: {
    type: Date,
    default: () => new Date()
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false },
  collection: 'quizzes'
});

export const QuizModel = model('Quiz', QuizSchema);