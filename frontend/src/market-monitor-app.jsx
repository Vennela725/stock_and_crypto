import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  LayoutDashboard, LineChart as LineChartIcon, Star, Bell, Briefcase, User,
  Settings, LogOut, Search, Moon, Sun, TrendingUp, TrendingDown, Plus, X,
  ShieldCheck, Users, Database, ScrollText, FileBarChart, ChevronRight,
  BellRing, Trash2, ArrowUpRight, ArrowDownRight, Wallet, ShoppingCart,
  Repeat, Check,
} from "lucide-react";
import { api } from "./services/api.js";

/* ---------------------------------------------------------
   DESIGN TOKENS
   Ticker-board palette: deep charcoal-teal base, brass/gold
   accent (nod to old exchange ticker boards), mono numerals
   for price data, grotesk for UI.
--------------------------------------------------------- */
const fontImport = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
`;

const THEMES = {
  dark: {
    base: "#0B1210", surface: "#121C19", elevated: "#1A2622", elevatedHover: "#213029",
    border: "#25332E", text: "#EDEAE2", muted: "#8B9A94", accent: "#D4A857",
    accentSoft: "#3A3122", up: "#3FBF7F", down: "#E5566B", upSoft: "#173325", downSoft: "#341A20",
  },
  light: {
    base: "#F6F5F1", surface: "#FFFFFF", elevated: "#F0EEE7", elevatedHover: "#E8E5DB",
    border: "#DEDACD", text: "#1B2320", muted: "#66756F", accent: "#A87B2C",
    accentSoft: "#F1E4C8", up: "#1F8F52", down: "#C43A4E", upSoft: "#E3F3E9", downSoft: "#FBE6E9",
  },
};

/* ---------------------------------------------------------
   FALLBACK / MOCK DATA FOR SIMULATION & INITIAL STATE
--------------------------------------------------------- */
function genHistory(base, points = 30, vol = 0.02) {
  let p = base;
  const out = [];
  for (let i = 0; i < points; i++) {
    p = p * (1 + (Math.random() - 0.5) * vol);
    out.push({ t: i, price: +p.toFixed(2) });
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

function buildInitialAssets() {
  return SEED_ASSETS.map((a) => {
    const history = genHistory(a.price, 30);
    const prev = history[0].price;
    const last = history[history.length - 1].price;
    return { ...a, price: last, change: +(((last - prev) / prev) * 100).toFixed(2), history };
  });
}

const MOCK_DATA_SOURCES = [
  { id: 1, name: "Crypto Feed API", status: "online", lastUpdated: "3s ago" },
  { id: 2, name: "Stock Market API", status: "online", lastUpdated: "5s ago" },
  { id: 3, name: "Forex Rates API", status: "online", lastUpdated: "8s ago" },
  { id: 4, name: "Historical Data Provider", status: "degraded", lastUpdated: "2m ago" },
];

const MOCK_AUDIT_LOGS = [
  { id: 1, user: "ananya@mail.com", activity: "Logged in", time: "09:12:04" },
  { id: 2, user: "devesh@mail.com", activity: "Created price alert (BTC > 115000)", time: "09:14:41" },
  { id: 3, user: "admin", activity: "Marked data source degraded: Historical Data Provider", time: "09:20:10" },
  { id: 4, user: "priya@mail.com", activity: "Account suspended by admin", time: "09:25:55" },
  { id: 5, user: "rahul@mail.com", activity: "Added AAPL to watchlist", time: "09:31:02" },
];

/* ---------------------------------------------------------
   GLOBAL STATE (Context) — Auth / Market / Watchlist /
   Alerts / Portfolio / Notifications
--------------------------------------------------------- */
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

function AppProvider({ children }) {
  const [theme, setTheme] = useState("dark");
  const [user, setUser] = useState(null); // { id, name, email, role, cashBalance, token }
  const [assets, setAssets] = useState(buildInitialAssets);
  const [watchlist, setWatchlist] = useState(["BTC", "AAPL", "EUR/USD"]);
  const [alerts, setAlerts] = useState([
    { id: 1, symbol: "BTC", condition: "above", target: 115000, status: "active" },
    { id: 2, symbol: "AAPL", condition: "below", target: 225, status: "active" },
  ]);
  const [portfolio, setPortfolio] = useState([
    { id: 1, symbol: "BTC", qty: 0.4, buyPrice: 98000 },
    { id: 2, symbol: "AAPL", qty: 25, buyPrice: 210 },
  ]);
  const [notifications, setNotifications] = useState([
    { id: 1, msg: "Welcome to your market dashboard.", read: true, time: "Yesterday" },
  ]);
  const [cash, setCash] = useState(50000);
  const [loading, setLoading] = useState(true);

  const assetsRef = useRef(assets);
  assetsRef.current = assets;

  // Auto-login on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('marketboard_token');
      if (token) {
        try {
          const u = await api.getMe();
          setUser(u);
        } catch (err) {
          console.warn("Session expired or backend unavailable:", err.message);
          localStorage.removeItem('marketboard_token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // Fetch initial assets from backend
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const data = await api.getAssets();
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((a) => {
            const hist = a.history && a.history.length > 0
              ? a.history.map((h, i) => ({ t: i, price: h.price }))
              : genHistory(a.price, 30);
            return {
              ...a,
              type: a.type === 'forex' ? 'currency' : a.type,
              history: hist,
            };
          });
          setAssets(formatted);
        }
      } catch (err) {
        console.warn("Using local assets fallback:", err.message);
      }
    };
    fetchAssets();
  }, []);

  // Sync user state from backend when authenticated
  useEffect(() => {
    if (!user || !localStorage.getItem('marketboard_token')) return;

    const syncUserData = async () => {
      try {
        // Portfolio
        const pData = await api.getPortfolio();
        if (pData && pData.holdings) {
          const formattedHoldings = pData.holdings.map((h, idx) => ({
            id: h._id || idx,
            assetId: h.asset?._id || h.asset,
            symbol: h.asset?.symbol || "UNKNOWN",
            qty: h.quantity,
            buyPrice: h.averageBuyPrice,
          }));
          setPortfolio(formattedHoldings);
        }

        // Watchlist
        const wData = await api.getWatchlist();
        if (wData && wData.assets) {
          const symbols = wData.assets.map((a) => (typeof a === 'object' ? a.symbol : a));
          setWatchlist(symbols);
        }

        // Alerts
        const aData = await api.getAlerts();
        if (Array.isArray(aData)) {
          const formattedAlerts = aData.map((al) => ({
            id: al._id || al.id,
            symbol: al.asset?.symbol || al.symbol,
            condition: al.condition,
            target: al.target,
            status: al.status,
          }));
          setAlerts(formattedAlerts);
        }

        // Notifications
        const nData = await api.getNotifications();
        if (Array.isArray(nData)) {
          const formattedNotifs = nData.map((n) => ({
            id: n._id || n.id,
            msg: n.message,
            read: n.read,
            time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
          setNotifications(formattedNotifs);
        }

        // Wallet / Cash
        const wlt = await api.getWallet();
        if (wlt && wlt.cashBalance !== undefined) {
          setCash(wlt.cashBalance);
        }
      } catch (err) {
        console.warn("Backend sync error:", err.message);
      }
    };

    syncUserData();
  }, [user]);

  // Auth helper methods
  const login = async (email, password) => {
    try {
      const data = await api.login({ email, password });
      localStorage.setItem('marketboard_token', data.token);
      setUser(data);
      if (data.cashBalance !== undefined) setCash(data.cashBalance);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || 'Login failed' };
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const data = await api.register({ name, email, password, role });
      localStorage.setItem('marketboard_token', data.token);
      setUser(data);
      if (data.cashBalance !== undefined) setCash(data.cashBalance);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('marketboard_token');
    setUser(null);
  };

  // Buy: deducts cash, adds to holding using a weighted-average buy price
  const buyAsset = async (symbol, qty) => {
    const asset = assetsRef.current.find((a) => a.symbol === symbol);
    if (!asset || qty <= 0) return { ok: false, error: "Invalid quantity." };
    const cost = asset.price * qty;
    if (cost > cash) return { ok: false, error: "Not enough cash balance." };

    // Try backend call if authenticated
    if (user && localStorage.getItem('marketboard_token')) {
      try {
        const res = await api.createOrder({ symbol, side: 'buy', quantity: qty });
        if (res.cashBalance !== undefined) setCash(res.cashBalance);

        // Refetch portfolio
        const pData = await api.getPortfolio();
        if (pData && pData.holdings) {
          const formattedHoldings = pData.holdings.map((h, idx) => ({
            id: h._id || idx,
            assetId: h.asset?._id || h.asset,
            symbol: h.asset?.symbol || "UNKNOWN",
            qty: h.quantity,
            buyPrice: h.averageBuyPrice,
          }));
          setPortfolio(formattedHoldings);
        }
        setNotifications((n) => [{ id: Date.now(), msg: `Bought ${qty} ${symbol} at $${fmt(asset.price)}.`, read: false, time: "Just now" }, ...n]);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message || "Order execution failed." };
      }
    }

    // Local state fallback for offline preview
    setCash((c) => +(c - cost).toFixed(2));
    setPortfolio((prev) => {
      const existing = prev.find((h) => h.symbol === symbol);
      if (existing) {
        const totalQty = existing.qty + qty;
        const avgPrice = (existing.buyPrice * existing.qty + cost) / totalQty;
        return prev.map((h) => (h.symbol === symbol ? { ...h, qty: totalQty, buyPrice: avgPrice } : h));
      }
      return [...prev, { id: Date.now(), symbol, qty, buyPrice: asset.price }];
    });
    setNotifications((n) => [{ id: Date.now(), msg: `Bought ${qty} ${symbol} at $${fmt(asset.price)}.`, read: false, time: "Just now" }, ...n]);
    return { ok: true };
  };

  // Sell: adds cash, reduces or removes holding
  const sellAsset = async (symbol, qty) => {
    const asset = assetsRef.current.find((a) => a.symbol === symbol);
    const holding = portfolio.find((h) => h.symbol === symbol);
    if (!asset || !holding || qty <= 0) return { ok: false, error: "Invalid quantity." };
    if (qty > holding.qty) return { ok: false, error: "You don't own that much." };

    if (user && localStorage.getItem('marketboard_token')) {
      try {
        const res = await api.createOrder({ symbol, side: 'sell', quantity: qty });
        if (res.cashBalance !== undefined) setCash(res.cashBalance);

        // Refetch portfolio
        const pData = await api.getPortfolio();
        if (pData && pData.holdings) {
          const formattedHoldings = pData.holdings.map((h, idx) => ({
            id: h._id || idx,
            assetId: h.asset?._id || h.asset,
            symbol: h.asset?.symbol || "UNKNOWN",
            qty: h.quantity,
            buyPrice: h.averageBuyPrice,
          }));
          setPortfolio(formattedHoldings);
        }
        setNotifications((n) => [{ id: Date.now(), msg: `Sold ${qty} ${symbol} at $${fmt(asset.price)}.`, read: false, time: "Just now" }, ...n]);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message || "Order execution failed." };
      }
    }

    // Local state fallback for offline preview
    const proceeds = asset.price * qty;
    setCash((c) => +(c + proceeds).toFixed(2));
    setPortfolio((prev) =>
      prev
        .map((h) => (h.symbol === symbol ? { ...h, qty: h.qty - qty } : h))
        .filter((h) => h.qty > 0.00001)
    );
    setNotifications((n) => [{ id: Date.now(), msg: `Sold ${qty} ${symbol} at $${fmt(asset.price)}.`, read: false, time: "Just now" }, ...n]);
    return { ok: true };
  };

  // Simulated real-time ticker drift
  useEffect(() => {
    const id = setInterval(() => {
      setAssets((prev) =>
        prev.map((a) => {
          const drift = (Math.random() - 0.5) * 0.015;
          const newPrice = +(a.price * (1 + drift)).toFixed(a.price < 5 ? 4 : 2);
          const change = +(a.change + drift * 100).toFixed(2);
          const history = [...a.history.slice(1), { t: a.history[a.history.length - 1].t + 1, price: newPrice }];
          return { ...a, price: newPrice, change: Math.max(-40, Math.min(40, change)), history };
        })
      );
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // Alert-condition checker
  useEffect(() => {
    const id = setInterval(() => {
      setAlerts((prevAlerts) => {
        let fired = [];
        const updated = prevAlerts.map((al) => {
          if (al.status !== "active") return al;
          const asset = assetsRef.current.find((a) => a.symbol === al.symbol);
          if (!asset) return al;
          const hit =
            (al.condition === "above" && asset.price >= al.target) ||
            (al.condition === "below" && asset.price <= al.target);
          if (hit) {
            fired.push(`${al.symbol} is now ${al.condition} ${al.target} (current: ${asset.price})`);
            return { ...al, status: "triggered" };
          }
          return al;
        });
        if (fired.length) {
          setNotifications((n) => [
            ...fired.map((msg, i) => ({ id: Date.now() + i, msg, read: false, time: "Just now" })),
            ...n,
          ]);
        }
        return updated;
      });
    }, 2600);
    return () => clearInterval(id);
  }, []);

  const value = {
    theme, setTheme,
    user, setUser, login, register, logout, loading,
    assets,
    watchlist, setWatchlist,
    alerts, setAlerts,
    portfolio, setPortfolio,
    notifications, setNotifications,
    cash, setCash, buyAsset, sellAsset,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

/* ---------------------------------------------------------
   SMALL HELPERS
--------------------------------------------------------- */
const fmt = (n, d = 2) =>
  n >= 1000
    ? n.toLocaleString(undefined, { maximumFractionDigits: d })
    : n.toLocaleString(undefined, { maximumFractionDigits: n < 5 ? 4 : d });

function Delta({ value, T }) {
  const up = value >= 0;
  return (
    <span
      style={{ color: up ? T.up : T.down, background: up ? T.upSoft : T.downSoft }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium font-mono"
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {up ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

/* ---------------------------------------------------------
   TICKER TAPE — signature element
--------------------------------------------------------- */
function TickerTape({ T }) {
  const { assets } = useApp();
  const doubled = [...assets, ...assets];
  return (
    <div
      style={{ background: T.elevated, borderColor: T.border }}
      className="w-full overflow-hidden border-b whitespace-nowrap"
    >
      <div className="ticker-track flex items-center py-2 gap-8">
        {doubled.map((a, i) => (
          <div key={i} className="flex items-center gap-2 px-2 shrink-0 font-mono text-xs">
            <span style={{ color: T.muted }}>{a.symbol}</span>
            <span style={{ color: T.text }}>{fmt(a.price)}</span>
            <span style={{ color: a.change >= 0 ? T.up : T.down }}>
              {a.change >= 0 ? "▲" : "▼"} {Math.abs(a.change).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
      <style>{`
        .ticker-track { width: max-content; animation: ticker-scroll 40s linear infinite; }
        @keyframes ticker-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}

/* ---------------------------------------------------------
   SIDEBAR / NAV
--------------------------------------------------------- */
const USER_NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "market", label: "Market", icon: LineChartIcon },
  { id: "watchlist", label: "Watchlist", icon: Star },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "portfolio", label: "Portfolio", icon: Briefcase },
  { id: "orders", label: "Orders", icon: Repeat },
  { id: "profile", label: "Profile", icon: User },
];
const ADMIN_NAV = [
  { id: "admin-dashboard", label: "Overview", icon: ShieldCheck },
  { id: "admin-users", label: "Users", icon: Users },
  { id: "admin-sources", label: "Data Sources", icon: Database },
  { id: "admin-logs", label: "Audit Logs", icon: ScrollText },
  { id: "admin-reports", label: "Reports", icon: FileBarChart },
];

function Sidebar({ T, page, setPage }) {
  const { user, logout } = useApp();
  const nav = user.role === "admin" ? ADMIN_NAV : USER_NAV;
  return (
    <aside
      style={{ background: T.surface, borderColor: T.border }}
      className="w-60 shrink-0 border-r h-full flex flex-col"
    >
      <div className="px-5 py-5 flex items-center gap-2" style={{ borderBottom: `1px solid ${T.border}` }}>
        <div
          style={{ background: T.accent }}
          className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-black"
        >
          ⌁
        </div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="font-semibold text-[15px]">
          <span style={{ color: T.text }}>Market</span>
          <span style={{ color: T.accent }}>Board</span>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        {nav.map((n) => {
          const Icon = n.icon;
          const active = page === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              style={{
                background: active ? T.accentSoft : "transparent",
                color: active ? T.accent : T.muted,
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
            >
              <Icon size={17} />
              {n.label}
            </button>
          );
        })}
      </nav>
      <div className="px-3 py-4" style={{ borderTop: `1px solid ${T.border}` }}>
        <button
          onClick={logout}
          style={{ color: T.muted }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:opacity-80"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>
    </aside>
  );
}

/* ---------------------------------------------------------
   TOPBAR
--------------------------------------------------------- */
function Topbar({ T, search, setSearch, setPage }) {
  const { theme, setTheme, notifications, user } = useApp();
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <div
      style={{ background: T.surface, borderColor: T.border }}
      className="h-16 shrink-0 border-b flex items-center justify-between px-6 gap-4"
    >
      <div className="relative w-full max-w-sm">
        <Search size={16} style={{ color: T.muted }} className="absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stocks, crypto, currency…"
          style={{ background: T.elevated, color: T.text, borderColor: T.border }}
          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm border outline-none focus:ring-1"
        />
      </div>
      <div className="flex items-center gap-3">
        <span style={{ color: T.muted }} className="text-xs font-mono hidden sm:block">
          {user.role === "admin" ? "Administrator" : "Investor"} · {user.name}
        </span>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          style={{ background: T.elevated, color: T.text }}
          className="p-2 rounded-lg"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            style={{ background: T.elevated, color: T.text }}
            className="p-2 rounded-lg relative"
          >
            <Bell size={16} />
            {unread > 0 && (
              <span
                style={{ background: T.down }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white"
              >
                {unread}
              </span>
            )}
          </button>
          {open && (
            <div
              style={{ background: T.elevated, borderColor: T.border }}
              className="absolute right-0 mt-2 w-80 border rounded-xl shadow-xl z-20 overflow-hidden"
            >
              <div style={{ borderColor: T.border }} className="px-4 py-3 border-b flex items-center justify-between">
                <span style={{ color: T.text }} className="text-sm font-medium">Notifications</span>
                <button onClick={() => { setOpen(false); setPage("notifications"); }} style={{ color: T.accent }} className="text-xs">
                  View all
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.slice(0, 5).map((n) => (
                  <div key={n.id} style={{ borderColor: T.border }} className="px-4 py-3 border-b text-xs">
                    <p style={{ color: T.text }}>{n.msg}</p>
                    <p style={{ color: T.muted }} className="mt-1">{n.time}</p>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <p style={{ color: T.muted }} className="p-4 text-xs">No notifications yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   SHARED: Card / Table / Chart
--------------------------------------------------------- */
function Card({ T, children, className = "", style = {} }) {
  return (
    <div
      style={{ background: T.surface, borderColor: T.border, ...style }}
      className={`border rounded-xl ${className}`}
    >
      {children}
    </div>
  );
}

function StatCard({ T, label, value, sub, accent }) {
  return (
    <Card T={T} className="p-4">
      <p style={{ color: T.muted }} className="text-xs">{label}</p>
      <p style={{ color: accent ? T.accent : T.text, fontFamily: "'IBM Plex Mono', monospace" }} className="text-2xl font-semibold mt-1">
        {value}
      </p>
      {sub && <p style={{ color: T.muted }} className="text-xs mt-1">{sub}</p>}
    </Card>
  );
}

function MiniSpark({ data, color }) {
  return (
    <ResponsiveContainer width={90} height={32}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="price" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function AssetTable({ T, assets, onSelect, onToggleWatch, watchlist }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: T.muted, borderColor: T.border }} className="border-b text-left text-xs uppercase tracking-wide">
            <th className="py-2.5 pr-3 font-medium">Asset</th>
            <th className="py-2.5 pr-3 font-medium">Price</th>
            <th className="py-2.5 pr-3 font-medium">24h</th>
            <th className="py-2.5 pr-3 font-medium hidden md:table-cell">Trend</th>
            <th className="py-2.5 pr-3 font-medium text-right">Watch</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr
              key={a.symbol}
              onClick={() => onSelect(a)}
              style={{ borderColor: T.border }}
              className="border-b last:border-0 cursor-pointer hover:opacity-90"
            >
              <td className="py-3 pr-3">
                <p style={{ color: T.text }} className="font-medium">{a.symbol}</p>
                <p style={{ color: T.muted }} className="text-xs">{a.name}</p>
              </td>
              <td style={{ color: T.text, fontFamily: "'IBM Plex Mono', monospace" }} className="py-3 pr-3">
                {fmt(a.price)}
              </td>
              <td className="py-3 pr-3"><Delta value={a.change} T={T} /></td>
              <td className="py-3 pr-3 hidden md:table-cell">
                <MiniSpark data={a.history} color={a.change >= 0 ? T.up : T.down} />
              </td>
              <td className="py-3 pr-3 text-right">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleWatch(a.symbol); }}
                  style={{ color: watchlist.includes(a.symbol) ? T.accent : T.muted }}
                >
                  <Star size={16} fill={watchlist.includes(a.symbol) ? T.accent : "none"} />
                </button>
              </td>
            </tr>
          ))}
          {assets.length === 0 && (
            <tr><td colSpan={5} style={{ color: T.muted }} className="py-8 text-center text-sm">No assets match your search.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------
   PAGES — AUTH
--------------------------------------------------------- */
function LoginPage({ T }) {
  const { login, register, setUser } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (isRegister) {
      if (!name || !email || !password) {
        setError("Please fill in all fields.");
        setSubmitting(false);
        return;
      }
      const res = await register(name, email, password, role === "admin" ? "admin" : "investor");
      if (!res.ok) setError(res.error);
    } else {
      if (!email || !password) {
        setError("Please enter your email and password.");
        setSubmitting(false);
        return;
      }
      const res = await login(email, password);
      if (!res.ok) setError(res.error);
    }
    setSubmitting(false);
  };

  return (
    <div style={{ background: T.base }} className="min-h-screen w-full flex items-center justify-center px-4">
      <Card T={T} className="w-full max-w-sm p-8">
        <div className="flex items-center gap-2 mb-6">
          <div style={{ background: T.accent }} className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-black">⌁</div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.text }} className="text-lg font-semibold">
            Market<span style={{ color: T.accent }}>Board</span>
          </span>
        </div>
        <h1 style={{ color: T.text }} className="text-xl font-semibold mb-1">
          {isRegister ? "Create account" : "Sign in"}
        </h1>
        <p style={{ color: T.muted }} className="text-sm mb-6">
          {isRegister ? "Register for real-time market access" : "Access your market dashboard"}
        </p>

        {error && (
          <div style={{ background: T.downSoft, color: T.down, borderColor: T.down }} className="p-2.5 mb-4 rounded-lg text-xs border">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label style={{ color: T.muted }} className="text-xs">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ananya Rao"
                style={{ background: T.elevated, color: T.text, borderColor: T.border }}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none"
              />
            </div>
          )}

          <div>
            <label style={{ color: T.muted }} className="text-xs">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ananya@mail.com"
              style={{ background: T.elevated, color: T.text, borderColor: T.border }}
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none"
            />
          </div>

          <div>
            <label style={{ color: T.muted }} className="text-xs">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ background: T.elevated, color: T.text, borderColor: T.border }}
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none"
            />
          </div>

          <div>
            <label style={{ color: T.muted }} className="text-xs">Account Type</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {["user", "admin"].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  style={{
                    background: role === r ? T.accentSoft : T.elevated,
                    color: role === r ? T.accent : T.muted,
                    borderColor: role === r ? T.accent : T.border,
                  }}
                  className="border rounded-lg py-2 text-sm capitalize"
                >
                  {r === "user" ? "Investor" : "Administrator"}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ background: T.accent }}
            className="w-full py-2.5 mt-2 rounded-lg font-medium text-black disabled:opacity-50"
          >
            {submitting ? "Processing..." : isRegister ? "Register" : "Enter dashboard"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
            style={{ color: T.accent }}
            className="text-xs hover:underline"
          >
            {isRegister ? "Already have an account? Sign in" : "Need an account? Register here"}
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------
   PAGES — DASHBOARD
--------------------------------------------------------- */
function DashboardPage({ T, setPage, setSelectedAsset }) {
  const { assets, watchlist, alerts, portfolio } = useApp();
  const topMovers = [...assets].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 5);
  const watched = assets.filter((a) => watchlist.includes(a.symbol));
  const activeAlerts = alerts.filter((a) => a.status === "active");
  const portfolioValue = portfolio.reduce((sum, h) => {
    const asset = assets.find((a) => a.symbol === h.symbol);
    return sum + (asset ? asset.price * h.qty : 0);
  }, 0);
  const portfolioCost = portfolio.reduce((sum, h) => sum + h.buyPrice * h.qty, 0);
  const pl = portfolioValue - portfolioCost;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 style={{ color: T.text, fontFamily: "'Space Grotesk', sans-serif" }} className="text-2xl font-semibold">Dashboard</h1>
        <p style={{ color: T.muted }} className="text-sm mt-1">Live snapshot across stocks, crypto and currency markets.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard T={T} label="Portfolio Value" value={`$${fmt(portfolioValue)}`} sub={`${pl >= 0 ? "+" : ""}$${fmt(pl)} P/L`} accent />
        <StatCard T={T} label="Watchlist" value={watched.length} sub="assets tracked" />
        <StatCard T={T} label="Active Alerts" value={activeAlerts.length} sub={`${alerts.length - activeAlerts.length} triggered`} />
        <StatCard T={T} label="Markets Live" value="3" sub="stocks · crypto · currency" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card T={T} className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ color: T.text }} className="font-medium text-sm">Top movers</h2>
            <button onClick={() => setPage("market")} style={{ color: T.accent }} className="text-xs flex items-center gap-1">
              View market <ChevronRight size={12} />
            </button>
          </div>
          <AssetTable T={T} assets={topMovers} onSelect={(a) => setSelectedAsset(a)} onToggleWatch={() => {}} watchlist={watchlist} />
        </Card>

        <Card T={T} className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ color: T.text }} className="font-medium text-sm">Watchlist preview</h2>
            <button onClick={() => setPage("watchlist")} style={{ color: T.accent }} className="text-xs flex items-center gap-1">
              All <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {watched.slice(0, 4).map((a) => (
              <div key={a.symbol} className="flex items-center justify-between">
                <div>
                  <p style={{ color: T.text }} className="text-sm font-medium">{a.symbol}</p>
                  <p style={{ color: T.muted }} className="text-xs">{fmt(a.price)}</p>
                </div>
                <Delta value={a.change} T={T} />
              </div>
            ))}
            {watched.length === 0 && <p style={{ color: T.muted }} className="text-xs">No assets watched yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   PAGES — MARKET
--------------------------------------------------------- */
function MarketPage({ T, search, setSelectedAsset }) {
  const { assets, watchlist, setWatchlist, user } = useApp();
  const [tab, setTab] = useState("all");
  const tabs = [
    { id: "all", label: "All" },
    { id: "stock", label: "Stocks" },
    { id: "crypto", label: "Crypto" },
    { id: "currency", label: "Currency" },
  ];
  const filtered = assets.filter(
    (a) =>
      (tab === "all" || a.type === tab) &&
      (a.symbol.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase()))
  );
  
  const toggleWatch = async (symbol) => {
    const isWatched = watchlist.includes(symbol);
    setWatchlist((w) => (isWatched ? w.filter((s) => s !== symbol) : [...w, symbol]));
    if (user && localStorage.getItem('marketboard_token')) {
      const asset = assets.find((a) => a.symbol === symbol);
      if (asset) {
        try {
          if (isWatched) {
            await api.removeFromWatchlist(asset._id || symbol);
          } else {
            await api.addToWatchlist(asset._id || symbol);
          }
        } catch (err) {
          console.warn("Watchlist API error:", err.message);
        }
      }
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 style={{ color: T.text, fontFamily: "'Space Grotesk', sans-serif" }} className="text-2xl font-semibold">Market</h1>
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? T.accentSoft : T.elevated,
              color: tab === t.id ? T.accent : T.muted,
            }}
            className="px-3 py-1.5 rounded-lg text-sm"
          >
            {t.label}
          </button>
        ))}
      </div>
      <Card T={T} className="p-5">
        <AssetTable T={T} assets={filtered} onSelect={setSelectedAsset} onToggleWatch={toggleWatch} watchlist={watchlist} />
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------
   BUY / SELL MODAL
--------------------------------------------------------- */
function BuySellModal({ T, asset, mode, onClose }) {
  const { cash, portfolio, buyAsset, sellAsset } = useApp();
  const [qty, setQty] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const holding = portfolio.find((h) => h.symbol === asset.symbol);
  const ownedQty = holding?.qty ?? 0;
  const qtyNum = parseFloat(qty) || 0;
  const estTotal = qtyNum * asset.price;

  const submit = async () => {
    setSubmitting(true);
    setError("");
    const result = mode === "buy" ? await buyAsset(asset.symbol, qtyNum) : await sellAsset(asset.symbol, qtyNum);
    setSubmitting(false);
    if (!result.ok) { setError(result.error); return; }
    setSuccess(true);
    setTimeout(onClose, 900);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: T.surface, borderColor: T.border }}
        className="w-full max-w-sm border rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div style={{ background: mode === "buy" ? T.upSoft : T.downSoft, color: mode === "buy" ? T.up : T.down }} className="w-8 h-8 rounded-lg flex items-center justify-center">
              {mode === "buy" ? <ShoppingCart size={15} /> : <Wallet size={15} />}
            </div>
            <div>
              <p style={{ color: T.text }} className="font-medium text-sm capitalize">{mode} {asset.symbol}</p>
              <p style={{ color: T.muted }} className="text-xs">Market price {fmt(asset.price)}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: T.muted }}><X size={18} /></button>
        </div>

        {success ? (
          <div className="py-6 flex flex-col items-center gap-2">
            <div style={{ background: T.upSoft, color: T.up }} className="w-10 h-10 rounded-full flex items-center justify-center"><Check size={18} /></div>
            <p style={{ color: T.text }} className="text-sm">Order filled.</p>
          </div>
        ) : (
          <>
            <div style={{ background: T.elevated, borderColor: T.border }} className="border rounded-lg p-3 mb-3 flex items-center justify-between text-xs">
              <span style={{ color: T.muted }}>Cash available</span>
              <span style={{ color: T.text }} className="font-mono">${fmt(cash)}</span>
            </div>
            {mode === "sell" && (
              <div style={{ background: T.elevated, borderColor: T.border }} className="border rounded-lg p-3 mb-3 flex items-center justify-between text-xs">
                <span style={{ color: T.muted }}>You own</span>
                <span style={{ color: T.text }} className="font-mono">{ownedQty} {asset.symbol}</span>
              </div>
            )}
            <label style={{ color: T.muted }} className="text-xs">Quantity</label>
            <input
              value={qty}
              onChange={(e) => { setQty(e.target.value); setError(""); }}
              placeholder="0.00"
              style={{ background: T.elevated, color: T.text, borderColor: T.border }}
              className="w-full mt-1 mb-2 px-3 py-2 rounded-lg text-sm border outline-none font-mono"
            />
            {mode === "sell" && ownedQty > 0 && (
              <button onClick={() => setQty(String(ownedQty))} style={{ color: T.accent }} className="text-xs mb-2">Sell all ({ownedQty})</button>
            )}
            <div className="flex items-center justify-between text-xs mb-4">
              <span style={{ color: T.muted }}>Estimated {mode === "buy" ? "cost" : "proceeds"}</span>
              <span style={{ color: T.text }} className="font-mono">${fmt(estTotal || 0)}</span>
            </div>
            {error && <p style={{ color: T.down }} className="text-xs mb-3">{error}</p>}
            <button
              onClick={submit}
              disabled={!qtyNum || submitting}
              style={{ background: mode === "buy" ? T.accent : T.elevated, color: mode === "buy" ? "#000" : T.text, borderColor: T.border }}
              className="w-full py-2.5 rounded-lg text-sm font-medium border disabled:opacity-50"
            >
              {submitting ? "Executing..." : mode === "buy" ? `Buy ${asset.symbol}` : `Sell ${asset.symbol}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   ASSET DETAIL (modal/drawer)
--------------------------------------------------------- */
function AssetDetail({ T, asset, onClose }) {
  const { watchlist, setWatchlist, alerts, setAlerts, portfolio, user } = useApp();
  const [range, setRange] = useState("1D");
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [condition, setCondition] = useState("above");
  const [target, setTarget] = useState("");
  const [tradeMode, setTradeMode] = useState(null); // "buy" | "sell" | null

  if (!asset) return null;
  const isWatched = watchlist.includes(asset.symbol);
  const owned = portfolio.find((h) => h.symbol === asset.symbol)?.qty ?? 0;

  const createAlert = async () => {
    if (!target) return;
    const newAlert = { id: Date.now(), symbol: asset.symbol, condition, target: parseFloat(target), status: "active" };
    setAlerts((a) => [...a, newAlert]);

    if (user && localStorage.getItem('marketboard_token')) {
      try {
        await api.createAlert({
          assetId: asset._id || asset.symbol,
          symbol: asset.symbol,
          condition,
          target: parseFloat(target),
        });
      } catch (err) {
        console.warn("Alert API error:", err.message);
      }
    }

    setShowAlertForm(false);
    setTarget("");
  };

  const toggleWatch = async () => {
    setWatchlist((w) => (isWatched ? w.filter((s) => s !== asset.symbol) : [...w, asset.symbol]));
    if (user && localStorage.getItem('marketboard_token')) {
      try {
        if (isWatched) {
          await api.removeFromWatchlist(asset._id || asset.symbol);
        } else {
          await api.addToWatchlist(asset._id || asset.symbol);
        }
      } catch (err) {
        console.warn("Watchlist API error:", err.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: T.surface, borderColor: T.border }}
        className="w-full max-w-md h-full border-l overflow-y-auto p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 style={{ color: T.text }} className="text-xl font-semibold">{asset.symbol}</h2>
            <p style={{ color: T.muted }} className="text-sm">{asset.name}</p>
          </div>
          <button onClick={onClose} style={{ color: T.muted }}><X size={20} /></button>
        </div>

        <div className="flex items-end gap-3 mb-4">
          <span style={{ color: T.text, fontFamily: "'IBM Plex Mono', monospace" }} className="text-3xl font-semibold">
            {fmt(asset.price)}
          </span>
          <Delta value={asset.change} T={T} />
        </div>

        <div className="flex gap-2 mb-3">
          {["1D", "7D", "1M", "1Y"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{ background: range === r ? T.accentSoft : T.elevated, color: range === r ? T.accent : T.muted }}
              className="px-2.5 py-1 rounded-md text-xs"
            >
              {r}
            </button>
          ))}
        </div>

        <div style={{ height: 200 }} className="mb-5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={asset.history}>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
              <XAxis dataKey="t" hide />
              <YAxis domain={["auto", "auto"]} tick={{ fill: T.muted, fontSize: 10 }} width={50} />
              <Tooltip
                contentStyle={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ display: "none" }}
              />
              <Line type="monotone" dataKey="price" stroke={asset.change >= 0 ? T.up : T.down} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {owned > 0 && (
          <p style={{ color: T.muted }} className="text-xs mb-2">You currently hold <span style={{ color: T.text }}>{owned} {asset.symbol}</span>.</p>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            onClick={() => setTradeMode("buy")}
            style={{ background: T.accent }}
            className="py-2.5 rounded-lg text-sm font-medium text-black flex items-center justify-center gap-2"
          >
            <ShoppingCart size={14} /> Buy
          </button>
          <button
            onClick={() => setTradeMode("sell")}
            disabled={owned <= 0}
            style={{ background: T.elevated, color: T.text, borderColor: T.border }}
            className="border py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Wallet size={14} /> Sell
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={toggleWatch}
            style={{ background: isWatched ? T.accentSoft : T.elevated, color: isWatched ? T.accent : T.text, borderColor: T.border }}
            className="border py-2 rounded-lg text-sm flex items-center justify-center gap-2"
          >
            <Star size={14} fill={isWatched ? T.accent : "none"} /> {isWatched ? "Watching" : "Add to Watchlist"}
          </button>
          <button
            onClick={() => setShowAlertForm((s) => !s)}
            style={{ background: T.elevated, color: T.text, borderColor: T.border }}
            className="border py-2 rounded-lg text-sm flex items-center justify-center gap-2"
          >
            <Bell size={14} /> Set Alert
          </button>
        </div>

        {tradeMode && <BuySellModal T={T} asset={asset} mode={tradeMode} onClose={() => setTradeMode(null)} />}

        {showAlertForm && (
          <Card T={T} className="p-4 mb-5 space-y-3">
            <div className="flex gap-2">
              {["above", "below"].map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  style={{ background: condition === c ? T.accentSoft : T.elevated, color: condition === c ? T.accent : T.muted }}
                  className="px-3 py-1.5 rounded-md text-xs capitalize"
                >
                  Price goes {c}
                </button>
              ))}
            </div>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={`Target price (e.g. ${fmt(asset.price)})`}
              style={{ background: T.base, color: T.text, borderColor: T.border }}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            />
            <button onClick={createAlert} style={{ background: T.accent }} className="w-full py-2 rounded-lg text-sm font-medium text-black">
              Create alert
            </button>
          </Card>
        )}

        <div>
          <h3 style={{ color: T.text }} className="text-sm font-medium mb-2">Stats</h3>
          <div style={{ color: T.muted }} className="grid grid-cols-2 gap-y-2 text-xs">
            <span>Type</span><span style={{ color: T.text }} className="text-right capitalize">{asset.type}</span>
            {asset.exchange && (<><span>Exchange</span><span style={{ color: T.text }} className="text-right">{asset.exchange}</span></>)}
            {asset.cap && (<><span>Market Cap</span><span style={{ color: T.text }} className="text-right">${asset.cap}</span></>)}
            {asset.base && (<><span>Pair</span><span style={{ color: T.text }} className="text-right">{asset.base}/{asset.target}</span></>)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   PAGES — WATCHLIST / ALERTS / PORTFOLIO / NOTIFICATIONS / PROFILE
--------------------------------------------------------- */
function WatchlistPage({ T, setSelectedAsset }) {
  const { assets, watchlist, setWatchlist, user } = useApp();
  const watched = assets.filter((a) => watchlist.includes(a.symbol));

  const toggleWatch = async (sym) => {
    setWatchlist((w) => w.filter((s) => s !== sym));
    if (user && localStorage.getItem('marketboard_token')) {
      const asset = assets.find((a) => a.symbol === sym);
      if (asset) {
        try {
          await api.removeFromWatchlist(asset._id || sym);
        } catch (err) {
          console.warn("Watchlist API error:", err.message);
        }
      }
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 style={{ color: T.text, fontFamily: "'Space Grotesk', sans-serif" }} className="text-2xl font-semibold">Watchlist</h1>
      <Card T={T} className="p-5">
        {watched.length === 0 ? (
          <p style={{ color: T.muted }} className="text-sm py-6 text-center">
            Nothing here yet — star an asset from the Market page to track it.
          </p>
        ) : (
          <AssetTable
            T={T} assets={watched} onSelect={setSelectedAsset}
            onToggleWatch={toggleWatch}
            watchlist={watchlist}
          />
        )}
      </Card>
    </div>
  );
}

function AlertsPage({ T }) {
  const { alerts, setAlerts, assets, user } = useApp();

  const removeAlert = async (id) => {
    setAlerts((a) => a.filter((x) => x.id !== id));
    if (user && localStorage.getItem('marketboard_token')) {
      try {
        await api.deleteAlert(id);
      } catch (err) {
        console.warn("Delete alert API error:", err.message);
      }
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 style={{ color: T.text, fontFamily: "'Space Grotesk', sans-serif" }} className="text-2xl font-semibold">Price Alerts</h1>
      <Card T={T} className="p-5">
        {alerts.length === 0 && <p style={{ color: T.muted }} className="text-sm">No alerts configured.</p>}
        <div className="space-y-3">
          {alerts.map((al) => {
            const asset = assets.find((a) => a.symbol === al.symbol);
            return (
              <div key={al.id} style={{ borderColor: T.border }} className="flex items-center justify-between border-b last:border-0 pb-3">
                <div>
                  <p style={{ color: T.text }} className="text-sm font-medium">{al.symbol}</p>
                  <p style={{ color: T.muted }} className="text-xs">
                    Alert when price goes {al.condition} {fmt(al.target)}
                    {asset && <> · current {fmt(asset.price)}</>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    style={{
                      color: al.status === "active" ? T.accent : T.muted,
                      background: al.status === "active" ? T.accentSoft : T.elevated,
                    }}
                    className="text-xs px-2 py-1 rounded-md capitalize"
                  >
                    {al.status}
                  </span>
                  <button onClick={() => removeAlert(al.id)} style={{ color: T.muted }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function WalletModal({ T, mode, onClose }) {
  const { setCash, setNotifications } = useApp();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Bank Transfer");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    setSubmitting(true);
    try {
      const res = mode === "deposit"
        ? await api.deposit({ amount: val, method })
        : await api.withdraw({ amount: val, method });
      if (res.cashBalance !== undefined) {
        setCash(res.cashBalance);
      }
      setNotifications((n) => [
        { id: Date.now(), msg: res.message || `${mode === "deposit" ? "Deposited" : "Withdrew"} $${val.toFixed(2)}`, read: false, time: "Just now" },
        ...n,
      ]);
      setSuccess(true);
      setTimeout(onClose, 1000);
    } catch (err) {
      setError(err.message || "Transaction failed");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, borderColor: T.border }} className="w-full max-w-sm border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 style={{ color: T.text }} className="font-semibold text-lg capitalize">{mode} Funds</h2>
          <button onClick={onClose} style={{ color: T.muted }}><X size={18} /></button>
        </div>
        {success ? (
          <div className="py-6 flex flex-col items-center gap-2">
            <div style={{ background: T.upSoft, color: T.up }} className="w-10 h-10 rounded-full flex items-center justify-center"><Check size={18} /></div>
            <p style={{ color: T.text }} className="text-sm font-medium">Transaction Completed!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label style={{ color: T.muted }} className="text-xs">Amount ($ USD)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000.00"
                style={{ background: T.elevated, color: T.text, borderColor: T.border }}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none font-mono"
              />
            </div>
            <div>
              <label style={{ color: T.muted }} className="text-xs">Payment Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={{ background: T.elevated, color: T.text, borderColor: T.border }}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Debit / Credit Card">Debit / Credit Card</option>
                <option value="Wire Transfer">Wire Transfer</option>
                <option value="Crypto Wallet">Crypto Wallet</option>
              </select>
            </div>
            {error && <p style={{ color: T.down }} className="text-xs">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              style={{ background: T.accent }}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-black disabled:opacity-50 mt-2"
            >
              {submitting ? "Processing..." : `Confirm ${mode}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function OrdersPage({ T }) {
  const { user } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (user && localStorage.getItem('marketboard_token')) {
        try {
          const data = await api.getOrders();
          if (Array.isArray(data)) setOrders(data);
        } catch (err) {
          console.warn("Orders fetch error:", err.message);
        }
      }
      setLoading(false);
    };
    fetchOrders();
  }, [user]);

  return (
    <div className="p-6 space-y-4">
      <h1 style={{ color: T.text, fontFamily: "'Space Grotesk', sans-serif" }} className="text-2xl font-semibold">Orders History</h1>
      <Card T={T} className="p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: T.muted, borderColor: T.border }} className="border-b text-left text-xs uppercase">
              <th className="py-2.5 pr-3">Order #</th>
              <th className="py-2.5 pr-3">Symbol</th>
              <th className="py-2.5 pr-3">Side</th>
              <th className="py-2.5 pr-3">Quantity</th>
              <th className="py-2.5 pr-3">Executed Price</th>
              <th className="py-2.5 pr-3">Total</th>
              <th className="py-2.5 pr-3">Status</th>
              <th className="py-2.5 pr-3 text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id || o.id} style={{ borderColor: T.border }} className="border-b last:border-0">
                <td style={{ color: T.text }} className="py-3 pr-3 font-mono text-xs">{o.orderNumber}</td>
                <td style={{ color: T.text }} className="py-3 pr-3 font-medium">{o.symbol}</td>
                <td className="py-3 pr-3">
                  <span style={{ color: o.side === 'buy' ? T.up : T.down, background: o.side === 'buy' ? T.upSoft : T.downSoft }} className="text-xs px-2 py-0.5 rounded-md uppercase font-semibold">
                    {o.side}
                  </span>
                </td>
                <td style={{ color: T.text }} className="py-3 pr-3 font-mono">{o.quantity}</td>
                <td style={{ color: T.text }} className="py-3 pr-3 font-mono">${fmt(o.executedPrice)}</td>
                <td style={{ color: T.text }} className="py-3 pr-3 font-mono">${fmt(o.quantity * o.executedPrice)}</td>
                <td style={{ color: T.up }} className="py-3 pr-3 text-xs capitalize">{o.status}</td>
                <td style={{ color: T.muted }} className="py-3 pr-3 text-right text-xs font-mono">
                  {new Date(o.executedAt || o.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: T.muted }} className="py-6 text-center text-sm">
                  {loading ? "Loading order history..." : "No orders executed yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function PortfolioPage({ T }) {
  const { portfolio, assets, cash } = useApp();
  const [trade, setTrade] = useState(null); // { asset, mode }
  const [pickerOpen, setPickerOpen] = useState(false);
  const [walletModal, setWalletModal] = useState(null); // "deposit" | "withdraw" | null

  const rows = portfolio.map((h) => {
    const asset = assets.find((a) => a.symbol === h.symbol);
    const value = asset ? asset.price * h.qty : 0;
    const cost = h.buyPrice * h.qty;
    return { ...h, asset, current: asset?.price ?? 0, value, pl: value - cost, plPct: cost ? (value - cost) / cost * 100 : 0 };
  });
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const totalPL = rows.reduce((s, r) => s + r.pl, 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 style={{ color: T.text, fontFamily: "'Space Grotesk', sans-serif" }} className="text-2xl font-semibold">Portfolio</h1>
        <button onClick={() => setPickerOpen(true)} style={{ background: T.accent }} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-black">
          <Plus size={15} /> Buy an asset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card T={T} className="p-4 flex flex-col justify-between">
          <div>
            <p style={{ color: T.muted }} className="text-xs">Cash Balance</p>
            <p style={{ color: T.text, fontFamily: "'IBM Plex Mono', monospace" }} className="text-2xl font-semibold mt-1">
              ${fmt(cash)}
            </p>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setWalletModal("deposit")} style={{ background: T.accentSoft, color: T.accent }} className="flex-1 py-1 rounded text-xs font-medium">
              Deposit
            </button>
            <button onClick={() => setWalletModal("withdraw")} style={{ background: T.elevated, color: T.text, borderColor: T.border }} className="flex-1 py-1 border rounded text-xs font-medium">
              Withdraw
            </button>
          </div>
        </Card>
        <StatCard T={T} label="Holdings Value" value={`$${fmt(totalValue)}`} accent />
        <StatCard T={T} label="Total P/L" value={`${totalPL >= 0 ? "+" : ""}$${fmt(totalPL)}`} sub={totalPL >= 0 ? "In profit" : "At a loss"} />
      </div>

      {pickerOpen && (
        <Card T={T} className="p-4">
          <p style={{ color: T.muted }} className="text-xs mb-2">Pick an asset to buy</p>
          <div className="flex flex-wrap gap-2">
            {assets.map((a) => (
              <button
                key={a.symbol}
                onClick={() => { setTrade({ asset: a, mode: "buy" }); setPickerOpen(false); }}
                style={{ background: T.elevated, color: T.text, borderColor: T.border }}
                className="border px-3 py-1.5 rounded-lg text-xs"
              >
                {a.symbol}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card T={T} className="p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: T.muted, borderColor: T.border }} className="border-b text-left text-xs uppercase">
              <th className="py-2.5 pr-3">Asset</th><th className="py-2.5 pr-3">Qty</th>
              <th className="py-2.5 pr-3">Avg. Buy</th><th className="py-2.5 pr-3">Current</th>
              <th className="py-2.5 pr-3">Value</th><th className="py-2.5 pr-3">P/L</th><th className="py-2.5 pr-3 text-right">Trade</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderColor: T.border }} className="border-b last:border-0">
                <td style={{ color: T.text }} className="py-3 pr-3 font-medium">{r.symbol}</td>
                <td style={{ color: T.text }} className="py-3 pr-3 font-mono">{r.qty}</td>
                <td style={{ color: T.text }} className="py-3 pr-3 font-mono">{fmt(r.buyPrice)}</td>
                <td style={{ color: T.text }} className="py-3 pr-3 font-mono">{fmt(r.current)}</td>
                <td style={{ color: T.text }} className="py-3 pr-3 font-mono">${fmt(r.value)}</td>
                <td className="py-3 pr-3"><Delta value={r.plPct} T={T} /></td>
                <td className="py-3 pr-3 text-right whitespace-nowrap">
                  <button onClick={() => setTrade({ asset: r.asset, mode: "buy" })} style={{ color: T.accent }} className="text-xs mr-3">Buy</button>
                  <button onClick={() => setTrade({ asset: r.asset, mode: "sell" })} style={{ color: T.down }} className="text-xs">Sell</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} style={{ color: T.muted }} className="py-6 text-center">No holdings yet — buy your first asset above.</td></tr>}
          </tbody>
        </table>
      </Card>

      {trade && <BuySellModal T={T} asset={trade.asset} mode={trade.mode} onClose={() => setTrade(null)} />}
      {walletModal && <WalletModal T={T} mode={walletModal} onClose={() => setWalletModal(null)} />}
    </div>
  );
}

function NotificationsPage({ T }) {
  const { notifications, setNotifications, user } = useApp();

  const markAllRead = async () => {
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
    if (user && localStorage.getItem('marketboard_token')) {
      try {
        await api.markAllNotificationsRead();
      } catch (err) {
        console.warn("Mark all read API error:", err.message);
      }
    }
  };

  const markRead = async (id) => {
    setNotifications((ns) => ns.map((x) => (x.id === id ? { ...x, read: true } : x)));
    if (user && localStorage.getItem('marketboard_token')) {
      try {
        await api.markNotificationRead(id);
      } catch (err) {
        console.warn("Mark read API error:", err.message);
      }
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 style={{ color: T.text, fontFamily: "'Space Grotesk', sans-serif" }} className="text-2xl font-semibold">Notifications</h1>
        <button onClick={markAllRead} style={{ color: T.accent }} className="text-sm">
          Mark all as read
        </button>
      </div>
      <Card T={T} className="p-2">
        {notifications.length === 0 && <p style={{ color: T.muted }} className="text-sm p-4">You're all caught up.</p>}
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => markRead(n.id)}
            style={{ borderColor: T.border, background: n.read ? "transparent" : T.accentSoft }}
            className="flex items-start gap-3 px-4 py-3 border-b last:border-0 rounded-lg cursor-pointer"
          >
            <BellRing size={16} style={{ color: n.read ? T.muted : T.accent }} className="mt-0.5" />
            <div>
              <p style={{ color: T.text }} className="text-sm">{n.msg}</p>
              <p style={{ color: T.muted }} className="text-xs mt-0.5">{n.time}</p>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ProfilePage({ T }) {
  const { user, setUser } = useApp();
  const [name, setName] = useState(user.name);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setUser({ ...user, name });
    if (user && localStorage.getItem('marketboard_token')) {
      try {
        await api.updateProfile({ name });
      } catch (err) {
        console.warn("Update profile API error:", err.message);
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-4 max-w-md">
      <h1 style={{ color: T.text, fontFamily: "'Space Grotesk', sans-serif" }} className="text-2xl font-semibold">Profile</h1>
      <Card T={T} className="p-5 space-y-4">
        <div>
          <label style={{ color: T.muted }} className="text-xs">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ background: T.elevated, color: T.text, borderColor: T.border }} className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none" />
        </div>
        <div>
          <label style={{ color: T.muted }} className="text-xs">Role</label>
          <p style={{ color: T.text }} className="mt-1 text-sm capitalize">{user.role === "admin" ? "Administrator" : "Investor"}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={save} style={{ background: T.accent }} className="px-4 py-2 rounded-lg text-sm font-medium text-black">
            Save changes
          </button>
          {saved && <span style={{ color: T.up }} className="text-xs">Saved!</span>}
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------
   ADMIN PAGES
--------------------------------------------------------- */
function AdminDashboardPage({ T }) {
  const { assets, alerts, user } = useApp();
  const [stats, setStats] = useState({ totalUsers: 4, activeUsers: 3, activeAlerts: alerts.filter(a=>a.status==='active').length, totalAssets: assets.length });

  useEffect(() => {
    if (user && localStorage.getItem('marketboard_token')) {
      api.getAdminStats().then((res) => {
        if (res) setStats(res);
      }).catch((err) => console.warn("Admin stats fetch error:", err.message));
    }
  }, [user]);

  const onlineSources = MOCK_DATA_SOURCES.filter((s) => s.status === "online").length;
  return (
    <div className="p-6 space-y-6">
      <h1 style={{ color: T.text, fontFamily: "'Space Grotesk', sans-serif" }} className="text-2xl font-semibold">System Overview</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard T={T} label="Total Users" value={stats.totalUsers} sub={`${stats.activeUsers} active`} accent />
        <StatCard T={T} label="Active Alerts" value={stats.activeAlerts} />
        <StatCard T={T} label="Data Sources Online" value={`${onlineSources}/${MOCK_DATA_SOURCES.length}`} />
        <StatCard T={T} label="Assets Tracked" value={stats.totalAssets || assets.length} />
      </div>
      <Card T={T} className="p-5">
        <h2 style={{ color: T.text }} className="text-sm font-medium mb-3">Recent activity</h2>
        <div className="space-y-2">
          {MOCK_AUDIT_LOGS.slice(0, 4).map((l) => (
            <div key={l.id} style={{ borderColor: T.border }} className="flex items-center justify-between border-b last:border-0 pb-2 text-sm">
              <span style={{ color: T.text }}>{l.activity}</span>
              <span style={{ color: T.muted }} className="text-xs font-mono">{l.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AdminUsersPage({ T }) {
  const { user } = useApp();
  const [users, setUsers] = useState([
    { id: 1, name: "Ananya Rao", email: "ananya@mail.com", status: "active", role: "user" },
    { id: 2, name: "Devesh Kulkarni", email: "devesh@mail.com", status: "active", role: "user" },
    { id: 3, name: "Priya Menon", email: "priya@mail.com", status: "suspended", role: "user" },
    { id: 4, name: "Rahul Verma", email: "rahul@mail.com", status: "active", role: "user" },
  ]);

  useEffect(() => {
    if (user && localStorage.getItem('marketboard_token')) {
      api.getAdminUsers().then((res) => {
        if (Array.isArray(res)) setUsers(res.map(u => ({ ...u, id: u._id || u.id })));
      }).catch((err) => console.warn("Admin users fetch error:", err.message));
    }
  }, [user]);

  const toggleStatus = async (u) => {
    const newStatus = u.status === "active" ? "suspended" : "active";
    setUsers((us) => us.map((x) => x.id === u.id ? { ...x, status: newStatus } : x));

    if (user && localStorage.getItem('marketboard_token')) {
      try {
        await api.updateAdminUserStatus(u.id, newStatus);
      } catch (err) {
        console.warn("Toggle status API error:", err.message);
      }
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 style={{ color: T.text, fontFamily: "'Space Grotesk', sans-serif" }} className="text-2xl font-semibold">Users</h1>
      <Card T={T} className="p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: T.muted, borderColor: T.border }} className="border-b text-left text-xs uppercase">
              <th className="py-2.5 pr-3">Name</th><th className="py-2.5 pr-3">Email</th>
              <th className="py-2.5 pr-3">Status</th><th className="py-2.5 pr-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderColor: T.border }} className="border-b last:border-0">
                <td style={{ color: T.text }} className="py-3 pr-3">{u.name}</td>
                <td style={{ color: T.muted }} className="py-3 pr-3">{u.email}</td>
                <td className="py-3 pr-3">
                  <span
                    style={{ color: u.status === "active" ? T.up : T.down, background: u.status === "active" ? T.upSoft : T.downSoft }}
                    className="text-xs px-2 py-1 rounded-md capitalize"
                  >
                    {u.status}
                  </span>
                </td>
                <td className="py-3 pr-3 text-right">
                  <button
                    onClick={() => toggleStatus(u)}
                    style={{ color: T.accent }}
                    className="text-xs"
                  >
                    {u.status === "active" ? "Suspend" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function AdminSourcesPage({ T }) {
  return (
    <div className="p-6 space-y-4">
      <h1 style={{ color: T.text, fontFamily: "'Space Grotesk', sans-serif" }} className="text-2xl font-semibold">Data Sources</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        {MOCK_DATA_SOURCES.map((s) => (
          <Card T={T} key={s.id} className="p-4 flex items-center justify-between">
            <div>
              <p style={{ color: T.text }} className="text-sm font-medium">{s.name}</p>
              <p style={{ color: T.muted }} className="text-xs mt-1">Updated {s.lastUpdated}</p>
            </div>
            <span
              style={{
                color: s.status === "online" ? T.up : T.down,
                background: s.status === "online" ? T.upSoft : T.downSoft,
              }}
              className="text-xs px-2 py-1 rounded-md capitalize"
            >
              {s.status}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminLogsPage({ T }) {
  return (
    <div className="p-6 space-y-4">
      <h1 style={{ color: T.text, fontFamily: "'Space Grotesk', sans-serif" }} className="text-2xl font-semibold">Audit Logs</h1>
      <Card T={T} className="p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: T.muted, borderColor: T.border }} className="border-b text-left text-xs uppercase">
              <th className="py-2.5 pr-3">User</th><th className="py-2.5 pr-3">Activity</th><th className="py-2.5 pr-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_AUDIT_LOGS.map((l) => (
              <tr key={l.id} style={{ borderColor: T.border }} className="border-b last:border-0">
                <td style={{ color: T.text }} className="py-3 pr-3 font-mono text-xs">{l.user}</td>
                <td style={{ color: T.text }} className="py-3 pr-3">{l.activity}</td>
                <td style={{ color: T.muted }} className="py-3 pr-3 font-mono text-xs">{l.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function AdminReportsPage({ T }) {
  const { assets } = useApp();
  const [type, setType] = useState("market-summary");
  const [generated, setGenerated] = useState(false);
  return (
    <div className="p-6 space-y-4">
      <h1 style={{ color: T.text, fontFamily: "'Space Grotesk', sans-serif" }} className="text-2xl font-semibold">Reports</h1>
      <Card T={T} className="p-5 space-y-4">
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label style={{ color: T.muted }} className="text-xs">Report type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ background: T.elevated, color: T.text, borderColor: T.border }} className="block mt-1 px-3 py-2 rounded-lg text-sm border">
              <option value="market-summary">Market Summary</option>
              <option value="user-activity">User Activity</option>
              <option value="alert-history">Alert History</option>
            </select>
          </div>
          <button onClick={() => setGenerated(true)} style={{ background: T.accent }} className="px-4 py-2 rounded-lg text-sm font-medium text-black">
            Generate report
          </button>
        </div>
        {generated && (
          <div style={{ borderColor: T.border }} className="border-t pt-4">
            {type === "market-summary" && (
              <AssetTable T={T} assets={assets.slice(0, 8)} onSelect={() => {}} onToggleWatch={() => {}} watchlist={[]} />
            )}
            {type === "user-activity" && (
              <ul style={{ color: T.text }} className="text-sm space-y-1">
                <li>Ananya Rao — active</li>
                <li>Devesh Kulkarni — active</li>
                <li>Admin User — active</li>
              </ul>
            )}
            {type === "alert-history" && (
              <p style={{ color: T.muted }} className="text-sm">System price alerts monitored via MongoDB.</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------
   ROOT SHELL
--------------------------------------------------------- */
function Shell() {
  const { user, theme } = useApp();
  const T = THEMES[theme];
  const [page, setPage] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAssetRaw] = useState(null);
  const { assets } = useApp();

  // keep selected asset in sync with live price updates
  const selectedAsset2 = useMemo(
    () => (selectedAsset ? assets.find((a) => a.symbol === selectedAsset.symbol) : null),
    [assets, selectedAsset]
  );

  if (!user) return <LoginPage T={T} />;

  return (
    <div style={{ background: T.base }} className="w-full h-screen flex flex-col overflow-hidden">
      <style>{fontImport}</style>
      <TickerTape T={T} />
      <div className="flex flex-1 min-h-0">
        <Sidebar T={T} page={page} setPage={setPage} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar T={T} search={search} setSearch={setSearch} setPage={setPage} />
          <div className="flex-1 overflow-y-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
            {page === "dashboard" && <DashboardPage T={T} setPage={setPage} setSelectedAsset={setSelectedAssetRaw} />}
            {page === "market" && <MarketPage T={T} search={search} setSelectedAsset={setSelectedAssetRaw} />}
            {page === "watchlist" && <WatchlistPage T={T} setSelectedAsset={setSelectedAssetRaw} />}
            {page === "alerts" && <AlertsPage T={T} />}
            {page === "portfolio" && <PortfolioPage T={T} />}
            {page === "orders" && <OrdersPage T={T} />}
            {page === "notifications" && <NotificationsPage T={T} />}
            {page === "profile" && <ProfilePage T={T} />}
            {page === "admin-dashboard" && <AdminDashboardPage T={T} />}
            {page === "admin-users" && <AdminUsersPage T={T} />}
            {page === "admin-sources" && <AdminSourcesPage T={T} />}
            {page === "admin-logs" && <AdminLogsPage T={T} />}
            {page === "admin-reports" && <AdminReportsPage T={T} />}
          </div>
        </div>
      </div>
      {selectedAsset2 && <AssetDetail T={T} asset={selectedAsset2} onClose={() => setSelectedAssetRaw(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
