require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const resourceRoutes = require('./routes/resource.routes');
const lostFoundRoutes = require('./routes/lostFound.routes');
const claimRoutes = require('./routes/claim.routes');
const messageRoutes = require('./routes/message.routes');
const adminRoutes = require('./routes/admin.routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ── Database ─────────────────────────────────────────────────────────────────
connectDB();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true, // Required for cookies to be sent cross-origin
}));

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Sessions ──────────────────────────────────────────────────────────────────
const SESSION_MAX_AGE_MS = parseInt(process.env.SESSION_MAX_AGE || '604800000');

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_do_not_use_in_production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.NODE_ENV === 'test'
      ? process.env.TEST_MONGO_URI
      : process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: SESSION_MAX_AGE_MS / 1000, // MongoStore expects seconds; env var is in ms
    autoRemove: 'native',           // Use MongoDB TTL index for cleanup
    touchAfter: 24 * 3600,          // Re-save session at most once per day (rolling)
  }),
  cookie: {
    httpOnly: true,         // Prevents JS access to cookie
    secure: false,          // false for local HTTP development
    sameSite: 'lax',        // CSRF protection; 'lax' required for Vite proxy navigation
    maxAge: SESSION_MAX_AGE_MS,
  },
  name: 'resource_hub.sid', // Custom name avoids fingerprinting
}));


// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/lost-found', lostFoundRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// ── Error Handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
