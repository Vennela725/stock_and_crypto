import express from 'express';
import { getWallet, deposit, withdraw } from '../controllers/walletController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getWallet);
router.post('/deposit', protect, deposit);
router.post('/withdraw', protect, withdraw);

export default router;
