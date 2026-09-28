import Watchlist from '../models/Watchlist.js';
import Asset from '../models/Asset.js';
import mongoose from 'mongoose';

// @desc    Get logged in user's watchlist
// @route   GET /api/watchlist
// @access  Private
export const getWatchlist = async (req, res, next) => {
  try {
    let watchlist = await Watchlist.findOne({ user: req.user._id }).populate('assets');
    if (!watchlist) {
      watchlist = await Watchlist.create({ user: req.user._id, assets: [] });
    }
    return res.json(watchlist);
  } catch (error) {
    next(error);
  }
};

// @desc    Add asset to user watchlist
// @route   POST /api/watchlist/:assetId
// @access  Private
export const addToWatchlist = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    let targetAssetId = assetId;

    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      // Try searching symbol
      const asset = await Asset.findOne({ symbol: assetId.toUpperCase() });
      if (!asset) return res.status(404).json({ message: 'Asset not found' });
      targetAssetId = asset._id;
    }

    const asset = await Asset.findById(targetAssetId);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    let watchlist = await Watchlist.findOne({ user: req.user._id });
    if (!watchlist) {
      watchlist = await Watchlist.create({ user: req.user._id, assets: [] });
    }

    if (!watchlist.assets.some((id) => id.toString() === targetAssetId.toString())) {
      watchlist.assets.push(targetAssetId);
      await watchlist.save();
    }

    const updatedWatchlist = await Watchlist.findById(watchlist._id).populate('assets');
    return res.json(updatedWatchlist);
  } catch (error) {
    next(error);
  }
};

// @desc    Remove asset from user watchlist
// @route   DELETE /api/watchlist/:assetId
// @access  Private
export const removeFromWatchlist = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    let targetAssetId = assetId;

    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      const asset = await Asset.findOne({ symbol: assetId.toUpperCase() });
      if (!asset) return res.status(404).json({ message: 'Asset not found' });
      targetAssetId = asset._id;
    }

    let watchlist = await Watchlist.findOne({ user: req.user._id });
    if (!watchlist) {
      return res.status(404).json({ message: 'Watchlist not found' });
    }

    watchlist.assets = watchlist.assets.filter(
      (id) => id.toString() !== targetAssetId.toString()
    );

    await watchlist.save();
    const updatedWatchlist = await Watchlist.findById(watchlist._id).populate('assets');
    return res.json(updatedWatchlist);
  } catch (error) {
    next(error);
  }
};
