import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  symbol: { type: String, required: true },
  side: { type: String, required: true, enum: ['buy', 'sell'] },
  quantity: { type: Number, required: true, min: 0 },
  executedPrice: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['executed', 'pending', 'cancelled'], default: 'executed' },
  executedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
