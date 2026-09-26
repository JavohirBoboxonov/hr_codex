import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-lodex'
    );
    console.log(`MongoDB ulandi: ${conn.connection.host}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('MongoDB ulanishda xato:', message);
    process.exit(1);
  }
};

export default connectDB;
