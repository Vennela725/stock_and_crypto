import mongoose from 'mongoose';

const watchlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  assets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }],
}, { timestamps: true });

export default mongoose.model('Watchlist', watchlistSchema);
