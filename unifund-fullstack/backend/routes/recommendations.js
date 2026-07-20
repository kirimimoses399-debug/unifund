const express = require('express');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get spending recommendations
router.get('/spending', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get spending patterns
    const categorySpend = db.prepare(`
      SELECT category, SUM(amount) as total, COUNT(*) as count FROM transactions
      WHERE user_id = ? AND type = 'purchase' AND date >= date('now', '-30 days')
      GROUP BY category ORDER BY total DESC
    `).all(userId);
    
    const totalSpend = categorySpend.reduce((sum, c) => sum + c.total, 0);
    const avgSpend = totalSpend / 30;
    
    const recommendations = [];
    
    // Identify top spending category
    if (categorySpend.length > 0) {
      const top = categorySpend[0];
      const topPercent = (top.total / totalSpend * 100).toFixed(1);
      recommendations.push({
        type: 'insight',
        title: 'Top Spending Category',
        description: `You spend ${topPercent}% of your budget on ${top.category}. Consider setting a budget limit for this category.`,
        priority: 'high'
      });
    }
    
    // Frequent small purchases suggestion
    const smallPurchases = db.prepare(`
      SELECT COUNT(*) as count FROM transactions
      WHERE user_id = ? AND type = 'purchase' AND amount < 100 AND date >= date('now', '-7 days')
    `).get(userId);
    
    if (smallPurchases.count > 10) {
      recommendations.push({
        type: 'tip',
        title: 'Frequent Small Purchases',
        description: `You made ${smallPurchases.count} small purchases this week. These can add up. Consider consolidating purchases.`,
        priority: 'medium'
      });
    }
    
    // Savings opportunity
    if (avgSpend > 500) {
      recommendations.push({
        type: 'savings',
        title: 'Savings Opportunity',
        description: 'Set aside 10% of your daily spending for a savings goal. You could save KSH ' + Math.round(avgSpend * 3) + ' per month.',
        priority: 'medium'
      });
    }
    
    // Budget alerts
    const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ?').all(userId);
    for (const budget of budgets) {
      const used = db.prepare(`
        SELECT SUM(amount) as total FROM transactions
        WHERE user_id = ? AND type = 'purchase' AND category = ? AND date >= ?
      `).get(userId, budget.category, budget.period_start);
      
      if (used.total > budget.amount * 0.8) {
        recommendations.push({
          type: 'alert',
          title: 'Budget Alert',
          description: `You've used ${(used.total / budget.amount * 100).toFixed(0)}% of your ${budget.category} budget.`,
          priority: 'high',
          budget_id: budget.id
        });
      }
    }
    
    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Get merchant recommendations based on spending
router.get('/merchants', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    
    const topMerchants = db.prepare(`
      SELECT merchant_id, merchant_name, COUNT(*) as visits, SUM(amount) as total FROM transactions
      WHERE user_id = ? AND type = 'purchase' AND merchant_name IS NOT NULL AND date >= date('now', '-60 days')
      GROUP BY merchant_id ORDER BY visits DESC LIMIT 5
    `).all(userId);
    
    res.json({ merchants: topMerchants });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch merchant recommendations' });
  }
});

module.exports = router;
