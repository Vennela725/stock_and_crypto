import User from '../models/User.js';
import Asset from '../models/Asset.js';
import Order from '../models/Order.js';
import Alert from '../models/Alert.js';
import mongoose from 'mongoose';

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const totalAssets = await Asset.countDocuments();
    const activeAlerts = await Alert.countDocuments({ status: 'active' });
    const totalOrders = await Order.countDocuments();

    return res.json({
      totalUsers,
      activeUsers,
      totalAssets,
      activeAlerts,
      totalOrders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users list
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status (active / suspended)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid User ID' });
    }

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Status must be "active" or "suspended"' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = status;
    await user.save();

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders across system
// @route   GET /api/admin/orders
// @access  Private/Admin
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('asset')
      .sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    next(error);
  }
};
