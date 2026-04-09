const prisma = require('../config/db');
const { createNotification } = require('./notifications');

/**
 * Updates spentAmount on a budget for a user+category+month+year.
 * Creates/checks warning/exceeded notifications.
 */
const updateBudgetSpent = async (io, { userId, categoryId, amount, date }) => {
  const d = date ? new Date(date) : new Date();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const budget = await prisma.budget.findUnique({
    where: { userId_categoryId_month_year: { userId, categoryId, month, year } },
    include: { category: true },
  });

  if (!budget) return; // No budget set, skip

  const newSpent = budget.spentAmount + amount;
  const updated = await prisma.budget.update({
    where: { id: budget.id },
    data: { spentAmount: newSpent },
  });

  const percentUsed = (newSpent / budget.limitAmount) * 100;

  if (percentUsed >= 100 && budget.spentAmount < budget.limitAmount) {
    await createNotification(io, {
      userId,
      type: 'BUDGET_EXCEEDED',
      title: `Budget Exceeded: ${budget.category.name}`,
      body: `You have exceeded your ${budget.category.name} budget of ${budget.limitAmount}.`,
      data: { budgetId: budget.id, categoryName: budget.category.name, limitAmount: budget.limitAmount, spentAmount: newSpent },
    });
  } else if (percentUsed >= 80 && budget.spentAmount / budget.limitAmount < 0.8) {
    await createNotification(io, {
      userId,
      type: 'BUDGET_WARNING',
      title: `Budget Warning: ${budget.category.name}`,
      body: `You've used ${Math.round(percentUsed)}% of your ${budget.category.name} budget.`,
      data: { budgetId: budget.id, categoryName: budget.category.name, percentUsed, limitAmount: budget.limitAmount },
    });
  }

  return updated;
};

module.exports = { updateBudgetSpent };
