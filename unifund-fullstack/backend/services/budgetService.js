const { db } = require('../config/database');
const { createNotification } = require('./notificationService');

const checkBudgetStatus = (userId, category) => {
  try {
    const budget = db.prepare('SELECT * FROM budgets WHERE user_id = ? AND category = ?').get(userId, category);
    if (!budget) return null;
    
    const used = db.prepare(`
      SELECT SUM(amount) as total FROM transactions
      WHERE user_id = ? AND type = 'purchase' AND category = ? AND date >= ?
    `).get(userId, category, budget.period_start);
    
    const usedAmount = used.total || 0;
    const remaining = budget.amount - usedAmount;
    const percentUsed = (usedAmount / budget.amount) * 100;
    
    // Alert if over 80%
    if (percentUsed >= 80 && !budget.alert_sent) {
      createNotification(userId, 'Budget Alert', `You've used ${percentUsed.toFixed(0)}% of your ${category} budget.`, 'budget', { category, remaining });
      db.prepare('UPDATE budgets SET alert_sent = ? WHERE id = ?').run(1, budget.id);
    }
    
    return { budget, used: usedAmount, remaining, percent_used: percentUsed };
  } catch (err) {
    console.error('Budget check error:', err);
    return null;
  }
};

module.exports = { checkBudgetStatus };
