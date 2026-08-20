import mongoose from 'mongoose';
import { env } from './env.js';

let cached = null;

export async function connectDB() {
  if (cached) return cached;
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000
  });
  console.log(`MongoDB connected: ${conn.connection.host}`);
  cached = conn;
  return conn;
}
