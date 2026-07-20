const { db } = require('../config/database');

const createNotification = (userId, title, body, type = 'general', data = null) => {
  try {
    const result = db.prepare(`
      INSERT INTO notifications (user_id, title, body, type, data)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, title, body, type, data ? JSON.stringify(data) : null);
    return result.lastInsertRowid;
  } catch (err) {
    console.error('Failed to create notification:', err);
    return null;
  }
};

const notifyTransaction = (userId, title, description, amount, type) => {
  return createNotification(userId, title, description, 'transaction', { amount, type });
};

const notifySavings = (userId, title, description, goalId) => {
  return createNotification(userId, title, description, 'savings', { goal_id: goalId });
};

module.exports = { createNotification, notifyTransaction, notifySavings };
