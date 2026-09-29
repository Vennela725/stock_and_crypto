import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) {
    throw new Error('[MongoDB] MONGO_URI is required. Add it to backend/.env or your Vercel Environment Variables.');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri, {
      bufferCommands: false,
    }).then((mongooseInstance) => {
      console.log('[MongoDB] Connected.');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw new Error(`[MongoDB] Connection failed: ${error.message}`);
  }

  return cached.conn;
};

export default connectDB;

