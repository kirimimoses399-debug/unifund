const { db } = require('../config/database');

const validateCoupon = (code, userId, amount) => {
  try {
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ?').get(code);
    if (!coupon) return { valid: false, error: 'Invalid coupon code' };
    if (!coupon.is_active) return { valid: false, error: 'Coupon is inactive' };
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return { valid: false, error: 'Coupon has expired' };
    if (coupon.min_amount && amount < coupon.min_amount) return { valid: false, error: `Minimum order amount KSH ${coupon.min_amount} required` };
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) return { valid: false, error: 'Coupon usage limit reached' };
    
    const userUsage = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE user_id = ? AND reference LIKE ?').get(userId, `%COUPON-${coupon.id}%`);
    if (coupon.per_user_limit && userUsage.count >= coupon.per_user_limit) return { valid: false, error: 'You have already used this coupon' };
    
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = Math.min(amount * (coupon.value / 100), coupon.max_discount || amount);
    } else if (coupon.type === 'fixed') {
      discount = Math.min(coupon.value, amount);
    } else if (coupon.type === 'free_shipping') {
      discount = coupon.value || 0;
    }
    
    return { valid: true, discount, coupon_id: coupon.id, code: coupon.code, type: coupon.type };
  } catch (err) {
    console.error('Coupon validation error:', err);
    return { valid: false, error: 'Coupon validation failed' };
  }
};

module.exports = { validateCoupon };
