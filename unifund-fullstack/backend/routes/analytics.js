const express = require('express');
const { db } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// User spending analytics
router.get('/spending', authenticate, (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const categorySpend = db.prepare(`
      SELECT category, SUM(amount) as total FROM transactions
      WHERE user_id = ? AND type = 'purchase' AND date >= ? AND category IS NOT NULL
      GROUP BY category ORDER BY total DESC
    `).all(req.user.id, daysAgo);
    
    const dailySpend = db.prepare(`
      SELECT date, SUM(amount) as total FROM transactions
      WHERE user_id = ? AND type = 'purchase' AND date >= ?
      GROUP BY date ORDER BY date
    `).all(req.user.id, daysAgo);
    
    const merchantSpend = db.prepare(`
      SELECT merchant_id, merchant_name, SUM(amount) as total, COUNT(*) as count FROM transactions
      WHERE user_id = ? AND type = 'purchase' AND date >= ? AND merchant_name IS NOT NULL
      GROUP BY merchant_id ORDER BY total DESC LIMIT 10
    `).all(req.user.id, daysAgo);
    
    const totalSpend = db.prepare(`
      SELECT SUM(amount) as total, COUNT(*) as count FROM transactions
      WHERE user_id = ? AND type = 'purchase' AND date >= ?
    `).get(req.user.id, daysAgo);
    
    res.json({
      period_days: parseInt(period),
      total_spent: totalSpend.total || 0,
      transaction_count: totalSpend.count || 0,
      category_breakdown: categorySpend,
      daily_trend: dailySpend,
      top_merchants: merchantSpend
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Admin platform analytics
router.get('/platform', authenticate, authorize('admin'), (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const activeUsers = db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM transactions WHERE date >= ?').get(daysAgo);
    const totalTransactions = db.prepare('SELECT COUNT(*) as count, SUM(amount) as total FROM transactions WHERE date >= ?').get(daysAgo);
    const totalDeposits = db.prepare('SELECT COUNT(*) as count, SUM(amount) as total FROM transactions WHERE type = ? AND date >= ?').get('deposit', daysAgo);
    const totalWithdrawals = db.prepare('SELECT COUNT(*) as count, SUM(amount) as total FROM transactions WHERE type = ? AND date >= ?').get('withdrawal', daysAgo);
    const totalPurchases = db.prepare('SELECT COUNT(*) as count, SUM(amount) as total FROM transactions WHERE type = ? AND date >= ?').get('purchase', daysAgo);
    const totalWalletBalance = db.prepare('SELECT SUM(balance) as total FROM wallets').get();
    const savingsGoals = db.prepare('SELECT COUNT(*) as count, SUM(target_amount) as target, SUM(current_amount) as saved FROM savings_goals').get();
    const activeGoals = db.prepare("SELECT COUNT(*) as count FROM savings_goals WHERE status = 'active'").get();
    
    const dailyTransactions = db.prepare(`
      SELECT date, COUNT(*) as count, SUM(amount) as total FROM transactions
      WHERE date >= ? GROUP BY date ORDER BY date
    `).all(daysAgo);
    
    res.json({
      users: { total: totalUsers.count, active: activeUsers.count },
      transactions: { total: totalTransactions.count, amount: totalTransactions.total || 0 },
      deposits: { total: totalDeposits.count, amount: totalDeposits.total || 0 },
      withdrawals: { total: totalWithdrawals.count, amount: totalWithdrawals.total || 0 },
      purchases: { total: totalPurchases.count, amount: totalPurchases.total || 0 },
      wallet_balance: totalWalletBalance.total || 0,
      savings: { total_goals: savingsGoals.count, target_amount: savingsGoals.target || 0, saved_amount: savingsGoals.saved || 0, active_goals: activeGoals.count },
      daily_trend: dailyTransactions
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch platform analytics' });
  }
});

module.exports = router;
