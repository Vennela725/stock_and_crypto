import Alert from '../models/Alert.js';
import Asset from '../models/Asset.js';
import mongoose from 'mongoose';

// @desc    Get logged in user alerts
// @route   GET /api/alerts
// @access  Private
export const getAlerts = async (req, res, next) => {
  try {
    const alerts = await Alert.find({ user: req.user._id })
      .populate('asset')
      .sort({ createdAt: -1 });
    return res.json(alerts);
  } catch (error) {
    next(error);
  }
};

// @desc    Create price alert
// @route   POST /api/alerts
// @access  Private
export const createAlert = async (req, res, next) => {
  try {
    const { assetId, symbol, condition, target } = req.body;

    if (!condition || !['above', 'below'].includes(condition)) {
      return res.status(400).json({ message: 'Condition must be "above" or "below"' });
    }

    if (target === undefined || target < 0) {
      return res.status(400).json({ message: 'Target price must be a non-negative number' });
    }

    let targetAssetId = assetId;
    if (!targetAssetId && symbol) {
      const asset = await Asset.findOne({ symbol: symbol.toUpperCase() });
      if (!asset) return res.status(404).json({ message: 'Asset not found' });
      targetAssetId = asset._id;
    }

    if (!mongoose.Types.ObjectId.isValid(targetAssetId)) {
      return res.status(400).json({ message: 'Invalid Asset ID' });
    }

    const alert = await Alert.create({
      user: req.user._id,
      asset: targetAssetId,
      condition,
      target: Number(target),
      status: 'active',
    });

    const populatedAlert = await Alert.findById(alert._id).populate('asset');
    return res.status(201).json(populatedAlert);
  } catch (error) {
    next(error);
  }
};

// @desc    Update alert status or target
// @route   PUT /api/alerts/:id
// @access  Private
export const updateAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Alert ID' });
    }

    const alert = await Alert.findOne({ _id: id, user: req.user._id });
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    if (req.body.status) alert.status = req.body.status;
    if (req.body.target !== undefined) alert.target = Number(req.body.target);
    if (req.body.condition) alert.condition = req.body.condition;

    await alert.save();
    const updatedAlert = await Alert.findById(alert._id).populate('asset');
    return res.json(updatedAlert);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete alert
// @route   DELETE /api/alerts/:id
// @access  Private
export const deleteAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Alert ID' });
    }

    const alert = await Alert.findOneAndDelete({ _id: id, user: req.user._id });
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    return res.json({ message: 'Alert removed successfully' });
  } catch (error) {
    next(error);
  }
};
