import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) {
    throw new Error('[MongoDB] MONGO_URI is required. Add it to backend/.env.');
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('[MongoDB] Connected.');
  } catch {
    throw new Error('[MongoDB] Connection failed. Check the Atlas URI, network access, and database credentials.');
  }
};

export default connectDB;
