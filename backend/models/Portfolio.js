import mongoose from 'mongoose';

const holdingSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  quantity: { type: Number, required: true, min: 0 },
  averageBuyPrice: { type: Number, required: true, min: 0 },
}, { _id: false });

const portfolioSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  holdings: { type: [holdingSchema], default: [] },
}, { timestamps: true });

export default mongoose.model('Portfolio', portfolioSchema);
