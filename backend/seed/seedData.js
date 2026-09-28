import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Asset from '../models/Asset.js';
import User from '../models/User.js';
import Portfolio from '../models/Portfolio.js';
import Watchlist from '../models/Watchlist.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

function genHistory(base, points = 30, vol = 0.02) {
  let p = base;
  const out = [];
  for (let i = 0; i < points; i++) {
    p = p * (1 + (Math.random() - 0.5) * vol);
    out.push({ price: +p.toFixed(2), recordedAt: new Date(Date.now() - (points - i) * 3600000) });
  }
  return out;
}

const SEED_ASSETS = [
  { symbol: "AAPL", name: "Apple Inc.", type: "stock", price: 231.4, exchange: "NASDAQ" },
  { symbol: "MSFT", name: "Microsoft Corp.", type: "stock", price: 512.8, exchange: "NASDAQ" },
  { symbol: "TSLA", name: "Tesla Inc.", type: "stock", price: 342.1, exchange: "NASDAQ" },
  { symbol: "NVDA", name: "NVIDIA Corp.", type: "stock", price: 178.6, exchange: "NASDAQ" },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: "stock", price: 228.9, exchange: "NASDAQ" },
  { symbol: "JPM", name: "JPMorgan Chase", type: "stock", price: 289.3, exchange: "NYSE" },
  { symbol: "BTC", name: "Bitcoin", type: "crypto", price: 112400, cap: "2.22T" },
  { symbol: "ETH", name: "Ethereum", type: "crypto", price: 4260, cap: "513B" },
  { symbol: "SOL", name: "Solana", type: "crypto", price: 198.5, cap: "107B" },
  { symbol: "BNB", name: "BNB", type: "crypto", price: 712, cap: "103B" },
  { symbol: "XRP", name: "XRP", type: "crypto", price: 2.41, cap: "140B" },
  { symbol: "ADA", name: "Cardano", type: "crypto", price: 0.87, cap: "31B" },
  { symbol: "EUR/USD", name: "Euro / US Dollar", type: "currency", price: 1.0842, base: "EUR", target: "USD" },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", type: "currency", price: 1.2735, base: "GBP", target: "USD" },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", type: "currency", price: 152.18, base: "USD", target: "JPY" },
  { symbol: "USD/INR", name: "US Dollar / Indian Rupee", type: "currency", price: 87.42, base: "USD", target: "INR" },
];

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stock_crypto_market';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB');

    // 1. Seed Assets (Upsert by symbol)
    for (const item of SEED_ASSETS) {
      const history = genHistory(item.price, 30);
      const prev = history[0].price;
      const last = history[history.length - 1].price;
      const change = +(((last - prev) / prev) * 100).toFixed(2);

      await Asset.findOneAndUpdate(
        { symbol: item.symbol },
        {
          ...item,
          price: last,
          change,
          history,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log('[Seed] Assets seeded successfully without duplicates');

    // 2. Seed Default Demo Users
    const demoUsers = [
      { name: "Ananya Rao", email: "ananya@mail.com", password: "password123", role: "investor" },
      { name: "Devesh Kulkarni", email: "devesh@mail.com", password: "password123", role: "investor" },
      { name: "Admin User", email: "admin@mail.com", password: "adminpassword", role: "admin" },
    ];

    for (const u of demoUsers) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create({
          name: u.name,
          email: u.email,
          passwordHash: u.password,
          role: u.role,
          cashBalance: 50000,
        });
        await Portfolio.create({ user: user._id, holdings: [] });
        await Watchlist.create({ user: user._id, assets: [] });
        console.log(`[Seed] User created: ${u.email}`);
      }
    }

    console.log('[Seed] Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error:', error.message);
    process.exit(1);
  }
};

seedDB();
