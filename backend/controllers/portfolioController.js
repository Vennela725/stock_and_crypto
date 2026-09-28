import Portfolio from '../models/Portfolio.js';
import Asset from '../models/Asset.js';
import mongoose from 'mongoose';

// @desc    Get logged in user's portfolio
// @route   GET /api/portfolio
// @access  Private
export const getPortfolio = async (req, res, next) => {
  try {
    let portfolio = await Portfolio.findOne({ user: req.user._id }).populate('holdings.asset');
    if (!portfolio) {
      portfolio = await Portfolio.create({ user: req.user._id, holdings: [] });
    }
    return res.json(portfolio);
  } catch (error) {
    next(error);
  }
};

// @desc    Add or update portfolio holding
// @route   POST /api/portfolio/holdings
// @access  Private
export const addOrUpdateHolding = async (req, res, next) => {
  try {
    const { assetId, symbol, quantity, averageBuyPrice } = req.body;

    if (quantity <= 0 || averageBuyPrice < 0) {
      return res.status(400).json({ message: 'Quantity must be positive and price non-negative' });
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

    let portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) {
      portfolio = await Portfolio.create({ user: req.user._id, holdings: [] });
    }

    const holdingIndex = portfolio.holdings.findIndex(
      (h) => h.asset.toString() === targetAssetId.toString()
    );

    if (holdingIndex > -1) {
      const existing = portfolio.holdings[holdingIndex];
      const newQty = existing.quantity + Number(quantity);
      const newAvg = (existing.averageBuyPrice * existing.quantity + Number(averageBuyPrice) * Number(quantity)) / newQty;
      portfolio.holdings[holdingIndex].quantity = newQty;
      portfolio.holdings[holdingIndex].averageBuyPrice = newAvg;
    } else {
      portfolio.holdings.push({
        asset: targetAssetId,
        quantity: Number(quantity),
        averageBuyPrice: Number(averageBuyPrice),
      });
    }

    await portfolio.save();
    const updatedPortfolio = await Portfolio.findById(portfolio._id).populate('holdings.asset');
    return res.json(updatedPortfolio);
  } catch (error) {
    next(error);
  }
};

// @desc    Update specific portfolio holding
// @route   PUT /api/portfolio/holdings/:assetId
// @access  Private
export const updateHolding = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { quantity, averageBuyPrice } = req.body;

    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return res.status(400).json({ message: 'Invalid Asset ID' });
    }

    const portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const holdingIndex = portfolio.holdings.findIndex(
      (h) => h.asset.toString() === assetId.toString()
    );

    if (holdingIndex === -1) {
      return res.status(404).json({ message: 'Holding not found' });
    }

    if (quantity <= 0) {
      portfolio.holdings.splice(holdingIndex, 1);
    } else {
      if (quantity !== undefined) portfolio.holdings[holdingIndex].quantity = Number(quantity);
      if (averageBuyPrice !== undefined) portfolio.holdings[holdingIndex].averageBuyPrice = Number(averageBuyPrice);
    }

    await portfolio.save();
    const updatedPortfolio = await Portfolio.findById(portfolio._id).populate('holdings.asset');
    return res.json(updatedPortfolio);
  } catch (error) {
    next(error);
  }
};

// @desc    Remove portfolio holding
// @route   DELETE /api/portfolio/holdings/:assetId
// @access  Private
export const removeHolding = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return res.status(400).json({ message: 'Invalid Asset ID' });
    }

    const portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    portfolio.holdings = portfolio.holdings.filter(
      (h) => h.asset.toString() !== assetId.toString()
    );

    await portfolio.save();
    const updatedPortfolio = await Portfolio.findById(portfolio._id).populate('holdings.asset');
    return res.json(updatedPortfolio);
  } catch (error) {
    next(error);
  }
};
