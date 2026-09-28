import mongoose from 'mongoose';

const pricePointSchema = new mongoose.Schema({
  price: { type: Number, required: true, min: 0 },
  recordedAt: { type: Date, default: Date.now },
}, { _id: false });

const assetSchema = new mongoose.Schema({
  symbol: { type: String, required: true, uppercase: true, trim: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, enum: ['stock', 'crypto', 'forex', 'currency'], index: true },
  exchange: { type: String, trim: true, default: '' },
  price: { type: Number, required: true, min: 0 },
  change: { type: Number, required: true, default: 0 },
  cap: { type: String, default: '' },
  base: { type: String, default: '' },
  target: { type: String, default: '' },
  history: { type: [pricePointSchema], default: [] },
}, { timestamps: true });

export default mongoose.model('Asset', assetSchema);
