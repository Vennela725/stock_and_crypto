import User from '../models/User.js';
import WalletTransaction from '../models/WalletTransaction.js';

// @desc    Get user wallet balance and transaction history
// @route   GET /api/wallet
// @access  Private
export const getWallet = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const transactions = await WalletTransaction.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    return res.json({
      cashBalance: user.cashBalance,
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deposit cash into user wallet
// @route   POST /api/wallet/deposit
// @access  Private
export const deposit = async (req, res, next) => {
  try {
    const { amount, method } = req.body;
    const depositAmount = Number(amount);

    if (!depositAmount || depositAmount <= 0) {
      return res.status(400).json({ message: 'Deposit amount must be greater than zero' });
    }

    const user = await User.findById(req.user._id);
    user.cashBalance = Number((user.cashBalance + depositAmount).toFixed(2));
    await user.save();

    const transaction = await WalletTransaction.create({
      user: user._id,
      type: 'deposit',
      method: method || 'Bank Transfer',
      amount: depositAmount,
      status: 'completed',
    });

    return res.status(201).json({
      message: `Successfully deposited $${depositAmount.toFixed(2)}`,
      cashBalance: user.cashBalance,
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Withdraw cash from user wallet
// @route   POST /api/wallet/withdraw
// @access  Private
export const withdraw = async (req, res, next) => {
  try {
    const { amount, method } = req.body;
    const withdrawAmount = Number(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
      return res.status(400).json({ message: 'Withdrawal amount must be greater than zero' });
    }

    const user = await User.findById(req.user._id);
    if (user.cashBalance < withdrawAmount) {
      return res.status(400).json({
        message: `Insufficient cash balance. Available: $${user.cashBalance.toFixed(2)}, Attempted: $${withdrawAmount.toFixed(2)}`
      });
    }

    user.cashBalance = Number((user.cashBalance - withdrawAmount).toFixed(2));
    await user.save();

    const transaction = await WalletTransaction.create({
      user: user._id,
      type: 'withdrawal',
      method: method || 'Bank Transfer',
      amount: withdrawAmount,
      status: 'completed',
    });

    return res.json({
      message: `Successfully withdrew $${withdrawAmount.toFixed(2)}`,
      cashBalance: user.cashBalance,
      transaction,
    });
  } catch (error) {
    next(error);
  }
};
