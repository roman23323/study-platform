import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './db';
import authRouter from './routes/auth';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.use(cors());
app.use(express.json());

app.use('/auth', authRouter);

app.get('/', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});