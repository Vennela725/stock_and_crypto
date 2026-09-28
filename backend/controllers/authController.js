import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import Portfolio from '../models/Portfolio.js';
import Watchlist from '../models/Watchlist.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const userRole = role === 'admin' ? 'admin' : 'investor';

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash: password,
      role: userRole,
    });

    // Initialize user portfolio and watchlist
    await Portfolio.create({ user: user._id, holdings: [] });
    await Watchlist.create({ user: user._id, assets: [] });

    return res.status(201).json({
      _id: user._id,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      cashBalance: user.cashBalance,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

    if (user && (await user.matchPassword(password))) {
      if (user.status === 'suspended') {
        return res.status(403).json({ message: 'Account is suspended. Please contact support.' });
      }

      return res.json({
        _id: user._id,
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        cashBalance: user.cashBalance,
        token: generateToken(user._id),
      });
    } else {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email.toLowerCase();
    if (req.body.password) user.passwordHash = req.body.password;

    const updatedUser = await user.save();

    return res.json({
      _id: updatedUser._id,
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      cashBalance: updatedUser.cashBalance,
      token: generateToken(updatedUser._id),
    });
  } catch (error) {
    next(error);
  }
};
