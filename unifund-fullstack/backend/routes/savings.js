const express = require('express');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

// Get savings goals
router.get('/', authenticate, (req, res) => {
  try {
    const goals = db.prepare('SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json({ goals });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch savings goals' });
  }
});

// Create savings goal
router.post('/', authenticate, (req, res) => {
  try {
    const { title, description, target_amount, auto_save_amount, auto_save_frequency, auto_save_day, category } = req.body;
    if (!title || !target_amount) return res.status(400).json({ error: 'Title and target amount required' });
    if (target_amount <= 0) return res.status(400).json({ error: 'Target amount must be positive' });
    
    const result = db.prepare(`
      INSERT INTO savings_goals (user_id, title, description, target_amount, auto_save_amount, auto_save_frequency, auto_save_day, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, title, description || null, target_amount, auto_save_amount || 0, auto_save_frequency || 'none', auto_save_day || null, category || 'general');
    
    res.status(201).json({ message: 'Savings goal created', goal_id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create savings goal' });
  }
});

// Add to savings goal
router.post('/:id/contribute', authenticate, (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    
    const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    if (goal.status === 'completed') return res.status(400).json({ error: 'Goal already completed' });
    
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
    if (wallet.balance < amount) return res.status(400).json({ error: 'Insufficient wallet balance' });
    
    // Deduct from wallet
    db.prepare('UPDATE wallets SET balance = balance - ? WHERE user_id = ?').run(amount, req.user.id);
    
    // Add to goal
    const newAmount = goal.current_amount + amount;
    const isCompleted = newAmount >= goal.target_amount;
    db.prepare(`
      UPDATE savings_goals SET current_amount = ?, status = ?, completed_at = ? WHERE id = ?
    `).run(newAmount, isCompleted ? 'completed' : 'active', isCompleted ? new Date().toISOString() : null, req.params.id);
    
    // Record transaction
    db.prepare(`
      INSERT INTO transactions (wallet_id, user_id, type, amount, balance_after, description, reference)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(wallet.id, req.user.id, 'transfer', -amount, wallet.balance - amount, `Savings: ${goal.title}`, `SAVINGS-${goal.id}`);
    
    if (isCompleted) {
      createNotification(req.user.id, 'Goal Completed!', `Congratulations! You reached your savings goal: ${goal.title}`, 'savings', { goal_id: goal.id, title: goal.title });
    }
    
    res.json({ message: 'Contribution successful', current_amount: newAmount, completed: isCompleted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to contribute to goal' });
  }
});

// Delete savings goal
router.delete('/:id', authenticate, (req, res) => {
  try {
    const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    
    // If goal has funds, return to wallet
    if (goal.current_amount > 0) {
      const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
      db.prepare('UPDATE wallets SET balance = balance + ? WHERE user_id = ?').run(goal.current_amount, req.user.id);
      db.prepare(`
        INSERT INTO transactions (wallet_id, user_id, type, amount, balance_after, description, reference)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(wallet.id, req.user.id, 'refund', goal.current_amount, wallet.balance + goal.current_amount, `Returned from ${goal.title}`, `SAVINGS-RETURN-${goal.id}`);
    }
    
    db.prepare('DELETE FROM savings_goals WHERE id = ?').run(req.params.id);
    res.json({ message: 'Savings goal deleted', returned: goal.current_amount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete savings goal' });
  }
});

module.exports = router;
