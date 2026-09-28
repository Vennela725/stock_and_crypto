# MarketBoard - Stock, Crypto & Forex Monitoring / Trading Platform

A full-stack financial market monitoring and trading application built with **React 18**, **Vite**, **Node.js**, **Express.js**, and **MongoDB (Mongoose)** with **JWT Authentication** and **Role-Based Authorization**.

---

## 📁 Project Structure

```
stock-and-crypto/
│
├── frontend/
│   ├── src/
│   │   ├── services/
│   │   │   └── api.js              # Centralized API service layer
│   │   ├── market-monitor-app.jsx   # Main React UI component
│   │   └── main.jsx                 # React root mounting script
│   ├── public/                      # Static assets
│   ├── index.html                   # HTML template
│   ├── package.json                 # Frontend dependencies
│   └── vite.config.js               # Vite config with API proxy
│
├── backend/
│   ├── config/
│   │   └── db.js                    # MongoDB Mongoose connection
│   │
│   ├── models/                      # Database Schemas & Models
│   │   ├── User.js                  # User credentials, bcrypt pre-save, role
│   │   ├── Asset.js                 # Stocks, Crypto, Forex/Currency data & history
│   │   ├── Portfolio.js             # User holdings & average buy prices
│   │   ├── Order.js                 # Buy/Sell order execution logs
│   │   ├── Alert.js                 # Target price alert triggers
│   │   ├── Notification.js          # System notifications
│   │   ├── Watchlist.js             # Tracked assets per user
│   │   └── WalletTransaction.js     # Cash deposits & withdrawals log
│   │
│   ├── controllers/                 # Route Business Logic
│   │   ├── authController.js        # Register, Login, Current User Profile
│   │   ├── assetController.js       # List, Search, Filter Assets
│   │   ├── portfolioController.js   # Holdings CRUD
│   │   ├── orderController.js       # Buy/Sell Order Execution logic
│   │   ├── alertController.js       # Alert CRUD
│   │   ├── notificationController.js# Notification status management
│   │   ├── watchlistController.js   # Add/Remove Watchlist items
│   │   ├── walletController.js      # Deposit/Withdraw cash balance
│   │   └── adminController.js       # System stats, user status control
│   │
│   ├── routes/                      # Express Endpoint Routers
│   │   ├── authRoutes.js
│   │   ├── assetRoutes.js
│   │   ├── portfolioRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── alertRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── watchlistRoutes.js
│   │   ├── walletRoutes.js
│   │   └── adminRoutes.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js        # JWT Bearer token protection
│   │   ├── adminMiddleware.js       # Admin role check
│   │   ├── errorMiddleware.js       # Centralized error handler
│   │   └── notFoundMiddleware.js    # 404 handler
│   │
│   ├── utils/
│   │   └── generateToken.js         # JWT signing helper
│   │
│   ├── seed/
│   │   └── seedData.js              # Idempotent DB seeding script
│   │
│   ├── .env.example                 # Environment configuration template
│   ├── package.json                 # Backend dependencies
│   └── server.js                    # Express application entry point
│
└── README.md                        # Documentation
```

---

## ⚡ Installation & Execution Commands

### Prerequisites
- **Node.js**: v18+ recommended
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017/stock_crypto_market`) or MongoDB Atlas URI.

---

### 1. Backend Setup & Startup

```powershell
# Navigate to the backend directory
cd "stock and crypto/backend"

# Install backend dependencies
npm install

# (Optional) Seed the database with initial assets and test users
npm run seed

# Start the Express server
npm start
```

Backend will run on: `http://localhost:5000`

---

### 2. Frontend Setup & Startup

Open a second terminal window:

```powershell
# Navigate to the frontend directory
cd "stock and crypto/frontend"

# Install frontend dependencies
npm install

# Start the Vite development server
npm run dev
```

Frontend will run on: `http://localhost:5173`

---

## 🔑 Default Seed Users

| Email | Password | Role | Description |
| :--- | :--- | :--- | :--- |
| `ananya@mail.com` | `password123` | `investor` | Standard Investor Account |
| `devesh@mail.com` | `password123` | `investor` | Standard Investor Account |
| `admin@mail.com` | `adminpassword` | `admin` | Administrator Account |

---

## 🔌 API Endpoint Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register a new user (`name`, `email`, `password`, `role`)
- `POST /api/auth/login` - Login user and obtain JWT token
- `GET /api/auth/me` - Get logged-in user profile (Protected)
- `PUT /api/auth/profile` - Update profile name, email, or password (Protected)

### Assets (`/api/assets`)
- `GET /api/assets` - Get all assets (Supports `?type=stock|crypto|currency` and `?search=query`)
- `GET /api/assets/:id` - Get asset details by MongoDB ID
- `GET /api/assets/symbol/:symbol` - Get asset details by Ticker Symbol

### Portfolio (`/api/portfolio`)
- `GET /api/portfolio` - Get logged-in user's portfolio holdings (Protected)
- `POST /api/portfolio/holdings` - Add/update holding (Protected)
- `PUT /api/portfolio/holdings/:assetId` - Update holding quantity/price (Protected)
- `DELETE /api/portfolio/holdings/:assetId` - Delete holding (Protected)

### Orders (`/api/orders`)
- `POST /api/orders` - Execute a `buy` or `sell` order with validation and cash adjustment (Protected)
- `GET /api/orders` - Get order execution history for user (Protected)
- `GET /api/orders/:id` - Get specific order details (Protected)

### Watchlist (`/api/watchlist`)
- `GET /api/watchlist` - Get user's watchlist (Protected)
- `POST /api/watchlist/:assetId` - Add asset to watchlist (Protected)
- `DELETE /api/watchlist/:assetId` - Remove asset from watchlist (Protected)

### Price Alerts (`/api/alerts`)
- `GET /api/alerts` - Get user's price alerts (Protected)
- `POST /api/alerts` - Create a price alert (`assetId`, `condition`, `target`) (Protected)
- `PUT /api/alerts/:id` - Update alert status or target (Protected)
- `DELETE /api/alerts/:id` - Delete price alert (Protected)

### Notifications (`/api/notifications`)
- `GET /api/notifications` - Get user notifications (Protected)
- `PUT /api/notifications/:id/read` - Mark single notification read (Protected)
- `PUT /api/notifications/read-all` - Mark all notifications read (Protected)
- `DELETE /api/notifications/:id` - Delete notification (Protected)

### Wallet (`/api/wallet`)
- `GET /api/wallet` - Get wallet balance & transaction history (Protected)
- `POST /api/wallet/deposit` - Deposit cash balance (Protected)
- `POST /api/wallet/withdraw` - Withdraw cash balance with validation (Protected)

### Admin (`/api/admin`)
- `GET /api/admin/stats` - System statistics summary (Admin Only)
- `GET /api/admin/users` - Get all user accounts (Admin Only)
- `PUT /api/admin/users/:id/status` - Change user status `active` vs `suspended` (Admin Only)
- `GET /api/admin/orders` - View all orders across all users (Admin Only)
