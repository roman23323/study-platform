import dotenv from 'dotenv';
import { LESSON_PROMPT, QUIZ_PROMPT } from "./prompts";
import GigaChat from 'gigachat';
import { Upload } from '../models/Upload';
import { getBufferFromS3 } from './storage';

dotenv.config();

const gigachat = new GigaChat({
  credentials: process.env.GIGACHAT_AUTH_KEY!,
  scope: 'GIGACHAT_API_PERS',
  model: 'GigaChat-2'
});

async function generateWithPrompt(prompt: string, attachments?: string[]): Promise<string> {
  try {
    console.log('📤 Sending to GigaChat:', {
      function_call: 'auto',
      messages: [
        {
          role: "user",
          content: prompt,
          attachments
        }
      ]
    });
    const response = await gigachat.chat({
      function_call: 'auto',
      messages: [
        {
          role: "user",
          content: prompt,
          attachments
        }
      ]
    });
    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from GigaChat');
    }

    return content.trim();
  } catch (error) {
    console.error('GigaChat SDK error:', error);
    throw error;
  }
}

export async function generateLesson(attachments: string[]): Promise<string> {
  const prompt = LESSON_PROMPT;
  return await generateWithPrompt(prompt, attachments);
}

// TODO: вынести в отдельный файл 
interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

interface Quiz {
  questions: [QuizQuestion, QuizQuestion, QuizQuestion];
}

export async function generateQuiz(lessonMarkdown: string): Promise<Quiz> {
  const prompt = QUIZ_PROMPT.replace('{{TEXT}}', lessonMarkdown);
  const raw = await generateWithPrompt(prompt);

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (
      !parsed.questions ||
      !Array.isArray(parsed.questions) ||
      parsed.questions.length !== 3
    ) {
      throw new Error('Invalid quiz structure: expected 3 questions');
    }
    for (const q of parsed.questions) {
      if (
        typeof q.question !== 'string' ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        typeof q.correctIndex !== 'number' ||
        q.correctIndex < 1 || q.correctIndex > 4
      ) {
        throw new Error('Invalid question format');
      }
      q.correctIndex = q.correctIndex - 1;
    }
    return parsed as Quiz;
  } catch (e) {
    console.error('[Quiz] Parsing failed. Raw response:', raw);
    throw new Error(`Failed to parse quiz: ${(e as Error).message}`);
  }
}

export async function uploadFileToGigaChat(uploadId: string): Promise<string> {
  try {
    const uploadRecord = await Upload.findById(uploadId);
    if (!uploadRecord) {
      throw new Error('Upload not found');
    }
    
    const buffer = await getBufferFromS3(uploadRecord.storageKey);
    const file = new File([buffer], uploadRecord.originalName, {
        type: uploadRecord.mimeType
    });

    const uploaded = await gigachat.uploadFile(file);

    if(!uploaded.id) {
        throw new Error('gigaChat responded without file id');
    }
    return uploaded.id;
  } catch (error) {
    console.error('[GigaChat] uploadFileToGigaChat failed:', error);
    throw new Error(`Failed to upload file to GigaChat: ${(error as Error).message}`);
  }
}