const prisma = require('../config/db');

// GET /dashboard/summary
const getSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd = new Date(currentYear, currentMonth, 1);
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear + 1, 0, 1);

    // ─── Current month totals ─────────────────────────────────────────────────
    const monthExpenses = await prisma.expense.findMany({
      where: { userId, date: { gte: monthStart, lt: monthEnd } },
      include: { category: { select: { id: true, name: true } } },
    });

    const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const monthCount = monthExpenses.length;

    // Group by category
    const categoryMap = {};
    for (const exp of monthExpenses) {
      const cid = exp.category.id;
      if (!categoryMap[cid]) {
        categoryMap[cid] = { categoryId: cid, categoryName: exp.category.name, total: 0 };
      }
      categoryMap[cid].total += exp.amount;
    }
    const byCategory = Object.values(categoryMap).sort((a, b) => b.total - a.total);
    const highestCategory = byCategory[0] || null;

    // ─── Current year total ───────────────────────────────────────────────────
    const yearAgg = await prisma.expense.aggregate({
      where: { userId, date: { gte: yearStart, lt: yearEnd } },
      _sum: { amount: true },
    });
    const yearTotal = yearAgg._sum.amount || 0;

    // ─── Last 6 months bar chart ──────────────────────────────────────────────
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const agg = await prisma.expense.aggregate({
        where: { userId, date: { gte: start, lt: end } },
        _sum: { amount: true },
      });

      last6Months.push({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        monthName: d.toLocaleString('default', { month: 'short' }),
        total: parseFloat((agg._sum.amount || 0).toFixed(2)),
      });
    }

    // ─── Daily spending for current month (line chart) ────────────────────────
    const dailyExpenses = await prisma.expense.findMany({
      where: { userId, date: { gte: monthStart, lt: monthEnd } },
      select: { date: true, amount: true },
    });

    const dailyMap = {};
    for (const exp of dailyExpenses) {
      const dateStr = exp.date.toISOString().split('T')[0];
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + exp.amount;
    }
    const dailyThisMonth = Object.entries(dailyMap)
      .map(([date, total]) => ({ date, total: parseFloat(total.toFixed(2)) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ─── Settlement summary ───────────────────────────────────────────────────
    const iOweSplits = await prisma.expenseSplit.findMany({
      where: {
        userId,
        status: { not: 'PAID' },
        sharedExpense: { paidById: { not: userId } },
      },
      select: { owedAmount: true, paidAmount: true },
    });

    const othersOweMeSplits = await prisma.expenseSplit.findMany({
      where: {
        userId: { not: userId },
        status: { not: 'PAID' },
        sharedExpense: { paidById: userId },
      },
      select: { owedAmount: true, paidAmount: true },
    });

    const totalOwe = iOweSplits.reduce((sum, s) => sum + (s.owedAmount - s.paidAmount), 0);
    const totalOwed = othersOweMeSplits.reduce((sum, s) => sum + (s.owedAmount - s.paidAmount), 0);

    return res.status(200).json({
      currentMonth: {
        totalExpenses: parseFloat(monthTotal.toFixed(2)),
        transactionCount: monthCount,
        highestCategory,
        byCategory,
      },
      currentYear: {
        totalExpenses: parseFloat(yearTotal.toFixed(2)),
      },
      last6Months,
      dailyThisMonth,
      settlements: {
        totalOwe: parseFloat(totalOwe.toFixed(2)),
        totalOwed: parseFloat(totalOwed.toFixed(2)),
        netBalance: parseFloat((totalOwed - totalOwe).toFixed(2)),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
};

// GET /dashboard/recent-transactions
const getRecentTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get last 5 personal expenses
    const personalExpenses = await prisma.expense.findMany({
      where: { userId, type: 'PERSONAL' },
      orderBy: { date: 'desc' },
      take: 5,
      include: { category: { select: { id: true, name: true } } },
    });

    // Get last 5 shared expenses involving the user
    const sharedExpenses = await prisma.sharedExpense.findMany({
      where: {
        OR: [
          { paidById: userId },
          { splits: { some: { userId } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        expense: { include: { category: { select: { id: true, name: true } } } },
        splits: { where: { userId }, select: { owedAmount: true, status: true } },
      },
    });

    // Merge and sort
    const combined = [
      ...personalExpenses.map((e) => ({
        id: e.id,
        title: e.title,
        amount: e.amount,
        createdAt: e.date,
        category: e.category,
        isShared: false,
        type: 'EXPENSE',
      })),
      ...sharedExpenses.map((se) => ({
        id: se.id,
        title: se.title,
        amount: se.expense.amount,
        createdAt: se.createdAt,
        category: se.expense.category,
        isShared: true,
        type: 'EXPENSE',
        myShare: se.splits[0]?.owedAmount || null,
        splitStatus: se.splits[0]?.status || null,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    return res.status(200).json({ transactions: combined });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch recent transactions' });
  }
};

module.exports = { getSummary, getRecentTransactions };
