const express = require('express');
const { db } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get user's notifications
router.get('/', authenticate, (req, res) => {
  try {
    const { limit = 50, offset = 0, unread_only } = req.query;
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [req.user.id];
    
    if (unread_only === 'true') { query += ' AND read = 0'; }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const notifications = db.prepare(query).all(...params);
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id);
    
    res.json({ notifications, unread_count: unreadCount.count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark as read
router.put('/:id/read', authenticate, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Mark all as read
router.put('/read-all', authenticate, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Delete notification
router.delete('/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Send notification (admin only)
router.post('/send', authenticate, authorize('admin'), (req, res) => {
  try {
    const { user_ids, title, body, type, data } = req.body;
    if (!user_ids || !title || !body) return res.status(400).json({ error: 'Missing fields' });
    
    const sent = [];
    for (const userId of user_ids) {
      const result = db.prepare(`
        INSERT INTO notifications (user_id, title, body, type, data)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, title, body, type || 'general', data ? JSON.stringify(data) : null);
      sent.push(result.lastInsertRowid);
    }
    
    res.json({ message: `Notification sent to ${sent.length} users` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

module.exports = router;
