import Asset from '../models/Asset.js';
import mongoose from 'mongoose';

// @desc    Get all assets (with optional search and type filtering)
// @route   GET /api/assets
// @access  Public
export const getAssets = async (req, res, next) => {
  try {
    const { type, search } = req.query;
    const query = {};

    if (type && type !== 'all') {
      if (type === 'currency' || type === 'forex') {
        query.type = { $in: ['currency', 'forex'] };
      } else {
        query.type = type;
      }
    }

    if (search) {
      query.$or = [
        { symbol: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const assets = await Asset.find(query).sort({ symbol: 1 });
    return res.json(assets);
  } catch (error) {
    next(error);
  }
};

// @desc    Get asset by ID
// @route   GET /api/assets/:id
// @access  Public
export const getAssetById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Asset ID format' });
    }

    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }
    return res.json(asset);
  } catch (error) {
    next(error);
  }
};

// @desc    Get asset by Symbol
// @route   GET /api/assets/symbol/:symbol
// @access  Public
export const getAssetBySymbol = async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const asset = await Asset.findOne({ symbol });
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }
    return res.json(asset);
  } catch (error) {
    next(error);
  }
};
