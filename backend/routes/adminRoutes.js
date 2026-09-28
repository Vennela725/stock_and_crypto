import express from 'express';
import {
  getAdminStats,
  getAllUsers,
  updateUserStatus,
  getAllOrders,
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.use(protect, admin);

router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);
router.get('/orders', getAllOrders);

export default router;
