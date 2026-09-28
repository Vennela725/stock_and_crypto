import express from 'express';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../controllers/watchlistController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getWatchlist);
router.post('/:assetId', protect, addToWatchlist);
router.delete('/:assetId', protect, removeFromWatchlist);

export default router;
