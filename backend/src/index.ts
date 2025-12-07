import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './db';
import authRouter from './routes/auth';
import fileRouter from './routes/files';
import lessonsRouter from './routes/lessons';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
connectDB();

app.use(cors());
app.use(express.json());

app.use('/auth', authRouter);
app.use('/files', fileRouter);
app.use('/ai', lessonsRouter);

app.get('/', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});