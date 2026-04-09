require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const prisma = require('./src/config/db');
const corsOptions = require('./src/config/corsOption');
const { initSocket } = require('./src/socket/socket');

// Route imports
const authRoutes = require('./src/routes/auth.routes');
const friendRoutes = require('./src/routes/friend.routes');
const categoryRoutes = require('./src/routes/category.routes');
const expenseRoutes = require('./src/routes/expense.routes');
const sharedExpenseRoutes = require('./src/routes/sharedExpense.routes');
const settlementRoutes = require('./src/routes/settlement.routes');
const budgetRoutes = require('./src/routes/budget.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const groupRoutes = require('./src/routes/group.routes');
const exportRoutes = require('./src/routes/export.routes');

const app = express();
const server = http.createServer(app);

// ─── Socket.io setup ─────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach io to app so controllers can access it via req.app.get('io')
app.set('io', io);
initSocket(io);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/shared-expenses', sharedExpenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/export', exportRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Expense Tracker API is running' });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready`);
  try {
    await prisma.$connect();
    console.log('🗄️  Database connected');
    // Seed categories on start
    await seedCategories();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
});

async function seedCategories() {
  const categories = [
    'Food', 'Transport', 'Shopping', 'Education',
    'Entertainment', 'Health & Medical', 'Utilities', 'Others'
  ];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('✅ Categories seeded');
}

module.exports = { app, server };
