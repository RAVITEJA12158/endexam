const prisma = require('../config/db');

// GET /export/csv
const exportCSV = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    const expenseWhere = { userId };
    const txnDateFilter = {};

    if (month || year) {
      const y = parseInt(year) || new Date().getFullYear();
      const m = parseInt(month);
      if (m) {
        expenseWhere.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
        txnDateFilter.createdAt = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
      } else {
        expenseWhere.date = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
        txnDateFilter.createdAt = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
      }
    }

    // 1) All personal/shared expenses belonging to this user
    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      include: {
        category: { select: { name: true } },
        sharedExpense: {
          include: {
            paidBy: { select: { username: true, name: true } },
            group: { select: { name: true } },
            splits: {
              where: { userId },
              select: { owedAmount: true, paidAmount: true, status: true },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // 2) Outgoing settlement payments made by this user
    const outgoingPayments = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'PAYMENT',
        ...txnDateFilter,
      },
      include: {
        split: {
          include: {
            sharedExpense: {
              include: {
                expense: { include: { category: { select: { name: true } } } },
                paidBy: { select: { username: true, name: true } },
                group: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3) Incoming payments — splits on expenses this user paid, where others have paid
    const incomingSplits = await prisma.expenseSplit.findMany({
      where: {
        userId: { not: userId },
        paidAmount: { gt: 0 },
        sharedExpense: { paidById: userId },
        ...(Object.keys(txnDateFilter).length > 0
          ? { transactions: { some: { type: 'PAYMENT', ...txnDateFilter } } }
          : {}),
      },
      include: {
        user: { select: { username: true, name: true } },
        sharedExpense: {
          include: {
            expense: { include: { category: { select: { name: true } } } },
            group: { select: { name: true } },
          },
        },
        transactions: {
          where: { type: 'PAYMENT' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Build CSV
    const rows = [];

    rows.push([
      'Date', 'Title', 'Type', 'Category', 'Total Amount',
      'Payment Mode', 'Your Share', 'Paid Amount', 'Status', 'Notes', 'Group', 'Paid By / From'
    ].join(','));

    // Personal & shared expenses
    for (const exp of expenses) {
      const isShared = exp.type === 'SHARED';
      const se = exp.sharedExpense;
      const mySplit = se?.splits?.[0];

      rows.push([
        formatDate(exp.date),
        csvEscape(exp.title),
        isShared ? 'Shared' : 'Personal',
        csvEscape(exp.category.name),
        exp.amount.toFixed(2),
        exp.paymentMode,
        mySplit ? mySplit.owedAmount.toFixed(2) : exp.amount.toFixed(2),
        mySplit ? mySplit.paidAmount.toFixed(2) : exp.amount.toFixed(2),
        mySplit ? mySplit.status : 'PAID',
        csvEscape(exp.notes || ''),
        csvEscape(se?.group?.name || ''),
        csvEscape(se ? (se.paidBy.name || se.paidBy.username) : ''),
      ].join(','));
    }

    // Outgoing settlement payments
    for (const txn of outgoingPayments) {
      if (!txn.split) continue;
      const se = txn.split.sharedExpense;
      if (!se) continue;
      rows.push([
        formatDate(txn.createdAt),
        csvEscape(`Payment for: ${se.expense.title}`),
        'Settlement Payment',
        csvEscape(se.expense.category.name),
        txn.amount.toFixed(2),
        txn.mode || '',
        txn.amount.toFixed(2),
        txn.amount.toFixed(2),
        'PAID',
        '',
        csvEscape(se.group?.name || ''),
        csvEscape(se.paidBy.name || se.paidBy.username),
      ].join(','));
    }

    // Incoming settlement receipts
    for (const split of incomingSplits) {
      const se = split.sharedExpense;
      if (!se) continue;
      const lastTxn = split.transactions[0];
      rows.push([
        formatDate(lastTxn ? lastTxn.createdAt : new Date()),
        csvEscape(`Received from ${split.user.name || split.user.username}: ${se.expense.title}`),
        'Settlement Received',
        csvEscape(se.expense.category.name),
        split.paidAmount.toFixed(2),
        lastTxn?.mode || '',
        split.paidAmount.toFixed(2),
        split.paidAmount.toFixed(2),
        'RECEIVED',
        '',
        csvEscape(se.group?.name || ''),
        csvEscape(split.user.name || split.user.username),
      ].join(','));
    }

    const csv = rows.join('\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `expenses_export_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error('Export error:', err);
    return res.status(500).json({ error: 'Failed to export CSV' });
  }
};

const formatDate = (date) => new Date(date).toISOString().split('T')[0];

const csvEscape = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`; 
  }
  return str;
};

module.exports = { exportCSV };