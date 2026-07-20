const express = require('express');
const { db } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const { role, status, search, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT id, email, phone, full_name, university, role, status, verified, created_at FROM users WHERE 1=1';
    const params = [];
    
    if (role) { query += ' AND role = ?'; params.push(role); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (search) { query += ' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const users = db.prepare(query).all(...params);
    const count = db.prepare('SELECT COUNT(*) as total FROM users').get().total;
    
    res.json({ users, total: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user
router.get('/:id', authenticate, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const user = db.prepare('SELECT id, email, phone, full_name, university, student_id, role, avatar, status, created_at FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId);
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
      FROM orders WHERE user_id = ?
    `).get(userId);
    
    res.json({ user, wallet, stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user status (admin only)
router.put('/:id/status', authenticate, authorize('admin'), (req, res) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ message: 'User status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Get user dashboard stats
router.get('/:id/dashboard', authenticate, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId);
    const recentOrders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(userId);
    const savings = db.prepare('SELECT * FROM savings_goals WHERE user_id = ? AND status = ? ORDER BY created_at DESC').all(userId, 'active');
    const vouchers = db.prepare('SELECT * FROM vouchers WHERE user_id = ? AND status = ? ORDER BY valid_until ASC').all(userId, 'active');
    const unread = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0').get(userId);
    
    res.json({
      wallet,
      recent_orders: recentOrders,
      active_savings: savings,
      active_vouchers: vouchers,
      unread_notifications: unread.count
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
