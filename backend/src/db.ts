import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI!);
    console.log(`MongoDB подключена: ${conn.connection.host}`);
  } catch (e) {
    console.error(`Ошибка подключения к MongoDB: ${(e as Error).message}`);
    process.exit(1);
  }
};

export default connectDB;