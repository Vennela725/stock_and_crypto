import Order from '../models/Order.js';
import User from '../models/User.js';
import Asset from '../models/Asset.js';
import Portfolio from '../models/Portfolio.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';

// Helper to generate unique order number
const genOrderNumber = () => {
  return `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
};

// @desc    Create and execute a Buy or Sell Order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res, next) => {
  try {
    const { assetId, symbol, side, quantity } = req.body;
    const qty = Number(quantity);

    if (!side || !['buy', 'sell'].includes(side)) {
      return res.status(400).json({ message: 'Order side must be "buy" or "sell"' });
    }

    if (!qty || qty <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than zero' });
    }

    let asset;
    if (assetId && mongoose.Types.ObjectId.isValid(assetId)) {
      asset = await Asset.findById(assetId);
    } else if (symbol) {
      asset = await Asset.findOne({ symbol: symbol.toUpperCase() });
    }

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let portfolio = await Portfolio.findOne({ user: user._id });
    if (!portfolio) {
      portfolio = await Portfolio.create({ user: user._id, holdings: [] });
    }

    const executedPrice = asset.price;
    const totalCost = qty * executedPrice;

    if (side === 'buy') {
      if (user.cashBalance < totalCost) {
        return res.status(400).json({
          message: `Insufficient cash balance. Required: $${totalCost.toFixed(2)}, Available: $${user.cashBalance.toFixed(2)}`
        });
      }

      // Deduct cash
      user.cashBalance = Number((user.cashBalance - totalCost).toFixed(2));
      await user.save();

      // Update portfolio
      const holdingIndex = portfolio.holdings.findIndex(
        (h) => h.asset.toString() === asset._id.toString()
      );

      if (holdingIndex > -1) {
        const existing = portfolio.holdings[holdingIndex];
        const newQty = existing.quantity + qty;
        const newAvg = (existing.averageBuyPrice * existing.quantity + totalCost) / newQty;
        portfolio.holdings[holdingIndex].quantity = newQty;
        portfolio.holdings[holdingIndex].averageBuyPrice = newAvg;
      } else {
        portfolio.holdings.push({
          asset: asset._id,
          quantity: qty,
          averageBuyPrice: executedPrice,
        });
      }
      await portfolio.save();

    } else if (side === 'sell') {
      const holdingIndex = portfolio.holdings.findIndex(
        (h) => h.asset.toString() === asset._id.toString()
      );

      if (holdingIndex === -1 || portfolio.holdings[holdingIndex].quantity < qty) {
        const ownedQty = holdingIndex > -1 ? portfolio.holdings[holdingIndex].quantity : 0;
        return res.status(400).json({
          message: `Insufficient asset holdings. You own ${ownedQty} ${asset.symbol}, but attempted to sell ${qty}`
        });
      }

      // Add cash
      user.cashBalance = Number((user.cashBalance + totalCost).toFixed(2));
      await user.save();

      // Reduce/remove holding
      const existing = portfolio.holdings[holdingIndex];
      const remainingQty = existing.quantity - qty;

      if (remainingQty <= 0.000001) {
        portfolio.holdings.splice(holdingIndex, 1);
      } else {
        portfolio.holdings[holdingIndex].quantity = remainingQty;
      }
      await portfolio.save();
    }

    // Create Order document
    const orderNumber = genOrderNumber();
    const order = await Order.create({
      orderNumber,
      user: user._id,
      asset: asset._id,
      symbol: asset.symbol,
      side,
      quantity: qty,
      executedPrice,
      status: 'executed',
      executedAt: new Date(),
    });

    // Create Notification
    await Notification.create({
      user: user._id,
      message: `${side.toUpperCase()} order executed: ${qty} ${asset.symbol} at $${executedPrice.toFixed(2)}.`,
      read: false,
    });

    const populatedOrder = await Order.findById(order._id).populate('asset');
    return res.status(201).json({
      message: 'Order executed successfully',
      order: populatedOrder,
      cashBalance: user.cashBalance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user order history
// @route   GET /api/orders
// @access  Private
export const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('asset')
      .sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Get order details by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Order ID' });
    }

    const order = await Order.findById(id).populate('asset');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    return res.json(order);
  } catch (error) {
    next(error);
  }
};
