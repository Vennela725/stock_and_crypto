import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true, enum: ['deposit', 'withdrawal'] },
  method: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['completed', 'processing', 'failed'], required: true, default: 'completed' },
}, { timestamps: true });

export default mongoose.model('WalletTransaction', walletTransactionSchema);
