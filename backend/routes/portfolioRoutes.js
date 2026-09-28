import express from 'express';
import {
  getPortfolio,
  addOrUpdateHolding,
  updateHolding,
  removeHolding,
} from '../controllers/portfolioController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getPortfolio);

router.route('/holdings')
  .post(protect, addOrUpdateHolding);

router.route('/holdings/:assetId')
  .put(protect, updateHolding)
  .delete(protect, removeHolding);

export default router;
