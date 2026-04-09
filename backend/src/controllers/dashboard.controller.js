const prisma = require('../config/db');

// GET /dashboard/summary
const getSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear  = now.getFullYear();

    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd   = new Date(currentYear, currentMonth,     1);
    const yearStart  = new Date(currentYear, 0, 1);
    const yearEnd    = new Date(currentYear + 1, 0, 1);

    // ─── Helper: net spent in a date range ───────────────────────────────────
    // Formula:
    //   + All expenses owned by user (personal + shared where user is payer)
    //   + Payments user made outward (settling their own share as non-payer)
    //   − Payments received back from others (repayments to user as payer)
    //
    // Example: A pays ₹300 for 3 people (₹100 each).
    //   A's expense record = ₹300
    //   B repays ₹100 → A receives ₹100 back
    //   A's net spent = ₹300 - ₹100 = ₹200 (still waiting for C)
    //   C repays ₹100 → A's net spent = ₹100 (their own share only)
    const getNetSpent = async (expDateStart, expDateEnd, txDateStart, txDateEnd) => {
      // All expenses the user owns
      const expAgg = await prisma.expense.aggregate({
        where: { userId, date: { gte: expDateStart, lt: expDateEnd } },
        _sum: { amount: true },
      });

      // Payments user made outward (they are the debtor paying back their split)
      const outPayAgg = await prisma.transaction.aggregate({
        where: {
          userId,
          type: 'PAYMENT',
          createdAt: { gte: txDateStart, lt: txDateEnd },
          split: {
            sharedExpense: { paidById: { not: userId } },
          },
        },
        _sum: { amount: true },
      });

      // Payments received back — someone else paid their split on an expense
      // where userId is the original payer
      const inPayAgg = await prisma.transaction.aggregate({
        where: {
          type: 'PAYMENT',
          createdAt: { gte: txDateStart, lt: txDateEnd },
          split: {
            sharedExpense: { paidById: userId },
            userId: { not: userId },
          },
        },
        _sum: { amount: true },
      });

      const expenses   = expAgg._sum.amount   || 0;
      const outPayment = outPayAgg._sum.amount || 0;
      const inPayment  = inPayAgg._sum.amount  || 0;

      return parseFloat((expenses + outPayment - inPayment).toFixed(2));
    };

    // ─── Current month totals ─────────────────────────────────────────────────
    const monthExpenses = await prisma.expense.findMany({
      where: { userId, date: { gte: monthStart, lt: monthEnd } },
      include: { category: { select: { id: true, name: true } } },
    });

    const monthOutPayments = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'PAYMENT',
        createdAt: { gte: monthStart, lt: monthEnd },
        split: { sharedExpense: { paidById: { not: userId } } },
      },
      select: { amount: true },
    });

    const monthExpenseTotal  = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const monthOutPayTotal   = monthOutPayments.reduce((sum, p) => sum + p.amount, 0);

    // Inbound repayments this month
    const monthInPayAgg = await prisma.transaction.aggregate({
      where: {
        type: 'PAYMENT',
        createdAt: { gte: monthStart, lt: monthEnd },
        split: {
          sharedExpense: { paidById: userId },
          userId: { not: userId },
        },
      },
      _sum: { amount: true },
    });
    const monthInPayTotal = monthInPayAgg._sum.amount || 0;

    const monthTotal = parseFloat((monthExpenseTotal + monthOutPayTotal - monthInPayTotal).toFixed(2));
    const monthCount = monthExpenses.length + monthOutPayments.length;

    // Group by category
    const categoryMap = {};
    for (const exp of monthExpenses) {
      const cid = exp.category.id;
      if (!categoryMap[cid]) {
        categoryMap[cid] = { categoryId: cid, categoryName: exp.category.name, name: exp.category.name, total: 0 };
      }
      categoryMap[cid].total += exp.amount;
    }
    // Subtract inbound repayments per category
    const monthInPaySplits = await prisma.transaction.findMany({
      where: {
        type: 'PAYMENT',
        createdAt: { gte: monthStart, lt: monthEnd },
        split: {
          sharedExpense: { paidById: userId },
          userId: { not: userId },
        },
      },
      select: {
        amount: true,
        split: {
          select: {
            sharedExpense: {
              select: {
                expense: { select: { category: { select: { id: true, name: true } } } },
              },
            },
          },
        },
      },
    });
    for (const tx of monthInPaySplits) {
      const cat = tx.split.sharedExpense.expense.category;
      if (categoryMap[cat.id]) {
        categoryMap[cat.id].total -= tx.amount;
      }
    }

    const byCategory = Object.values(categoryMap)
      .map(c => ({ ...c, total: parseFloat(c.total.toFixed(2)) }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);

    const highestCategory = byCategory[0]
      ? { id: byCategory[0].categoryId, name: byCategory[0].categoryName, amount: byCategory[0].total }
      : null;

    // ─── Current year total ───────────────────────────────────────────────────
    const yearTotal = await getNetSpent(yearStart, yearEnd, yearStart, yearEnd);

    // ─── Last 6 months bar chart ──────────────────────────────────────────────
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d     = new Date(currentYear, currentMonth - 1 - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      last6Months.push({
        month:     d.getMonth() + 1,
        year:      d.getFullYear(),
        monthName: d.toLocaleString('default', { month: 'short' }),
        total:     await getNetSpent(start, end, start, end),
      });
    }

    // ─── Daily spending for current month (line chart) ────────────────────────
    const dailyExpenses = await prisma.expense.findMany({
      where: { userId, date: { gte: monthStart, lt: monthEnd } },
      select: { date: true, amount: true },
    });

    const dailyOutPayments = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'PAYMENT',
        createdAt: { gte: monthStart, lt: monthEnd },
        split: { sharedExpense: { paidById: { not: userId } } },
      },
      select: { createdAt: true, amount: true },
    });

    const dailyInPayments = await prisma.transaction.findMany({
      where: {
        type: 'PAYMENT',
        createdAt: { gte: monthStart, lt: monthEnd },
        split: {
          sharedExpense: { paidById: userId },
          userId: { not: userId },
        },
      },
      select: { createdAt: true, amount: true },
    });

    const dailyMap = {};
    for (const exp of dailyExpenses) {
      const d = exp.date.toISOString().split('T')[0];
      dailyMap[d] = (dailyMap[d] || 0) + exp.amount;
    }
    for (const pay of dailyOutPayments) {
      const d = pay.createdAt.toISOString().split('T')[0];
      dailyMap[d] = (dailyMap[d] || 0) + pay.amount;
    }
    for (const pay of dailyInPayments) {
      const d = pay.createdAt.toISOString().split('T')[0];
      dailyMap[d] = (dailyMap[d] || 0) - pay.amount;
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

    const totalOwe  = iOweSplits.reduce((sum, s) => sum + (s.owedAmount - s.paidAmount), 0);
    const totalOwed = othersOweMeSplits.reduce((sum, s) => sum + (s.owedAmount - s.paidAmount), 0);

    return res.status(200).json({
      currentMonth: {
        totalExpenses:    monthTotal,
        transactionCount: monthCount,
        highestCategory,
        byCategory,
      },
      currentYear: {
        totalExpenses: yearTotal,
      },
      last6Months,
      dailyThisMonth,
      settlements: {
        totalOwe:   parseFloat(totalOwe.toFixed(2)),
        totalOwed:  parseFloat(totalOwed.toFixed(2)),
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

    // All expenses owned by user (personal + shared as payer)
    const myExpenses = await prisma.expense.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 5,
      include: { category: { select: { id: true, name: true } } },
    });

    // Shared expenses where user is a non-payer split member
    const sharedAsDebtor = await prisma.sharedExpense.findMany({
      where: {
        splits: { some: { userId } },
        paidById: { not: userId },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        expense: { include: { category: { select: { id: true, name: true } } } },
        splits:  { where: { userId }, select: { owedAmount: true, status: true } },
      },
    });

    // Settlement payments the user made (paying back their share)
    const settlementPayments = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'PAYMENT',
        split: { sharedExpense: { paidById: { not: userId } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        split: {
          include: {
            sharedExpense: {
              include: {
                expense: { include: { category: { select: { id: true, name: true } } } },
              },
            },
          },
        },
      },
    });

    // Repayments received from others (inbound — reduces user's net spend)
    const repayments = await prisma.transaction.findMany({
      where: {
        type: 'PAYMENT',
        split: {
          sharedExpense: { paidById: userId },
          userId: { not: userId },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        split: {
          include: {
            user: { select: { id: true, name: true, username: true } },
            sharedExpense: {
              include: {
                expense: { include: { category: { select: { id: true, name: true } } } },
              },
            },
          },
        },
      },
    });

    const combined = [
      ...myExpenses.map((e) => ({
        id:        e.id,
        title:     e.title,
        amount:    e.amount,
        createdAt: e.date,
        category:  e.category,
        isShared:  e.type === 'SHARED',
        type:      'EXPENSE',
      })),
      ...sharedAsDebtor.map((se) => ({
        id:          se.id,
        title:       se.title,
        amount:      se.expense.amount,
        createdAt:   se.createdAt,
        category:    se.expense.category,
        isShared:    true,
        type:        'EXPENSE',
        myShare:     se.splits[0]?.owedAmount || null,
        splitStatus: se.splits[0]?.status     || null,
      })),
      ...settlementPayments.filter((t) => t.split).map((t) => ({
        id:        t.id,
        title:     `Paid: ${t.split.sharedExpense.title}`,
        amount:    t.amount,
        createdAt: t.createdAt,
        category:  t.split.sharedExpense.expense.category,
        isShared:  true,
        type:      'PAYMENT',
      })),
      ...repayments.filter((t) => t.split).map((t) => ({
        id:        t.id,
        title:     `Received: ${t.split.sharedExpense.title}`,
        amount:    -t.amount, // negative = money coming back
        createdAt: t.createdAt,
        category:  t.split.sharedExpense.expense.category,
        isShared:  true,
        type:      'REPAYMENT',
        fromUser:  t.split.user,
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