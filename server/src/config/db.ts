import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb+srv://javohirboboxonovmaxmudovich_db_user:A9ohtWjtZb9nVFhz@cluster0.etsntrs.mongodb.net/?appName=Cluster0'
    );
    console.log(`MongoDB ulandi: ${conn.connection.host}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('MongoDB ulanishda xato:', message);
    process.exit(1);
  }
};

export default connectDB;
