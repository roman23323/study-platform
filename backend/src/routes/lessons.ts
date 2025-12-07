import { Router } from "express";
import { ensureFileInGigaChat } from "../services/gigaFileCache";
import { generateLesson, generateQuiz } from "../services/aiService";
import { LessonModel } from "../models/Lesson";
import { QuizModel } from "../models/Quiz";
import { authenticateToken } from "./middlewares/authMiddleware";
import { Upload } from "../models/Upload";

const lessonsRouter = Router();

lessonsRouter.post('/generate-lesson', authenticateToken, async (req, res) => {
  try {
    const { uploadId } = req.body;
    if (!uploadId) return res.status(400).json({ error: 'uploadId required' });
    
    // TODO: вынести проверку прав в middleware
    const uploadRecord = await Upload.findById(uploadId);
    if (!uploadRecord) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    if (uploadRecord.userId !== req.user?.userId) {
      return res.status(403).json({ error: 'Access to requested file is forbidden' });
    }

    const gigaFileId = await ensureFileInGigaChat(uploadId);

    const lessonMarkdown = await generateLesson([gigaFileId]);
    
    const lessonDoc = await LessonModel.create({ uploadId: uploadRecord._id, content: lessonMarkdown });

    const quiz = await generateQuiz(lessonMarkdown);

    const quizDoc = await QuizModel.create({ uploadId, questions: quiz.questions })

    res.status(201).json({
        lessonId: lessonDoc._id,
        quizId: quizDoc._id,
        lesson: lessonMarkdown,
        quiz
    });
  } catch (err) {
    console.error('Lesson generation failed:', err);
    res.status(500).json({ error: 'Generation failed' });
  }
});

lessonsRouter.get('/lessons', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const lessons = await Upload.aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: 'lessons',
          localField: '_id',
          foreignField: 'uploadId',
          as: 'lesson'
        }
      },
      {
        $lookup: {
          from: 'quizzes',
          localField: '_id',
          foreignField: 'uploadId',
          as: 'quiz'
        }
      },
      {
        $addFields: {
          lessonId: { $arrayElemAt: ['$lesson._id', 0] },
          quizId: { $arrayElemAt: ['$quiz._id', 0] },
        }
      },
      {
        $project: {
          _id: 1,
          originalName: 1,
          size: 1,
          mimeType: 1,
          uploadedAt: 1,
          lessonId: 1,
          quizId: 1
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    
    res.json(lessons);
  } catch (e) {
    console.error('Failed to fetch materials:', e);
    res.status(500).json({ error: 'Failed to load materials' });
  }
});

lessonsRouter.get('/lesson/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.userId;

    if (!lessonId || !userId) {
      return res.status(400).json({ error: 'lessonId and user required' });
    }

    const lesson = await LessonModel.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const upload = await Upload.findById(lesson.uploadId);
    if (!upload) {
      return res.status(404).json({ error: 'Source upload not found' });
    }

    if (upload.userId !== userId) {
      return res.status(403).json({ error: 'Access forbidden' });
    }

    res.json({
      lessonId: lesson._id,
      uploadId: lesson.uploadId,
      content: lesson.content,
    });
  } catch (err) {
    console.error('Failed to fetch lesson:', err);
    res.status(500).json({ error: 'Failed to load lesson' });
  }
});

lessonsRouter.get('/quiz/:quizId', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user?.userId;

    if (!quizId || !userId) {
      return res.status(400).json({ error: 'quizId and user required' });
    }

    const quiz = await QuizModel.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const upload = await Upload.findById(quiz.uploadId);
    if (!upload) {
      return res.status(404).json({ error: 'Source upload not found' });
    }

    if (upload.userId !== userId) {
      return res.status(403).json({ error: 'Access forbidden' });
    }

    res.json({
      quizId: quiz._id,
      uploadId: quiz.uploadId,
      questions: quiz.questions,
    });
  } catch (err) {
    console.error('Failed to fetch quiz:', err);
    res.status(500).json({ error: 'Failed to load quiz' });
  }
});

export default lessonsRouter;