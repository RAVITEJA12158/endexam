const prisma = require('../config/db');

// GET /export/csv
const exportCSV = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    const where = { userId };
    if (month || year) {
      const y = parseInt(year) || new Date().getFullYear();
      const m = parseInt(month);
      if (m) {
        where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
      } else {
        where.date = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
      }
    }

    // Fetch all personal expenses
    const expenses = await prisma.expense.findMany({
      where,
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

    // Fetch settlements where this user paid others (outgoing)
    const settlements = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'PAYMENT',
        ...(where.date ? { createdAt: where.date } : {}),
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

    // Fetch settlements where others paid this user (incoming)
    const receivedSettlements = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'PAYMENT_RECEIVED',
        ...(where.date ? { createdAt: where.date } : {}),
      },
      include: {
        split: {
          include: {
            user: { select: { username: true, name: true } },
            sharedExpense: {
              include: {
                expense: { include: { category: { select: { name: true } } } },
                group: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Build CSV rows
    const rows = [];

    // Header
    rows.push([
      'Date', 'Title', 'Type', 'Category', 'Total Amount',
      'Payment Mode', 'Your Share', 'Paid Amount', 'Status', 'Notes', 'Group', 'Paid By'
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

    // Settlement payments (outgoing — you paid someone)
    for (const txn of settlements) {
      if (!txn.split) continue;
      const se = txn.split.sharedExpense;
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

    // Received settlements (incoming — someone paid you)
    for (const txn of receivedSettlements) {
      if (!txn.split) continue;
      const se = txn.split.sharedExpense;
      const paidByUser = txn.split.user;
      rows.push([
        formatDate(txn.createdAt),
        csvEscape(`Received payment for: ${se.expense.title}`),
        'Settlement Received',
        csvEscape(se.expense.category.name),
        txn.amount.toFixed(2),
        txn.mode || '',
        txn.amount.toFixed(2),
        txn.amount.toFixed(2),
        'RECEIVED',
        '',
        csvEscape(se.group?.name || ''),
        csvEscape(paidByUser?.name || paidByUser?.username || ''),
      ].join(','));
    }

    const csv = rows.join('\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `expenses_export_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error(err);
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