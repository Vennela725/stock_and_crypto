import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  condition: { type: String, required: true, enum: ['above', 'below'] },
  target: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['active', 'triggered', 'disabled'], default: 'active' },
  triggeredAt: Date,
}, { timestamps: true });

export default mongoose.model('Alert', alertSchema);
