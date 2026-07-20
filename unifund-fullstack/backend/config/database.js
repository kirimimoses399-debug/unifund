const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database/unifund.db');
const dbDir = path.dirname(DB_PATH);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const init = () => {
  try {
    // Users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        university TEXT,
        student_id TEXT,
        role TEXT DEFAULT 'student' CHECK(role IN ('student', 'vendor', 'admin', 'merchant')),
        avatar TEXT,
        verified INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'banned')),
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Wallets table
    db.exec(`
      CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        balance REAL DEFAULT 0,
        food_voucher_balance REAL DEFAULT 0,
        market_voucher_balance REAL DEFAULT 0,
        total_topped_up REAL DEFAULT 0,
        total_spent REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Products table
    db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL CHECK(category IN ('food', 'meal_plan', 'grocery', 'textbook', 'electronics', 'fashion', 'services', 'swap')),
        subcategory TEXT,
        price REAL NOT NULL,
        compare_price REAL,
        currency TEXT DEFAULT 'KSH',
        stock INTEGER DEFAULT 0,
        low_stock_threshold INTEGER DEFAULT 10,
        images TEXT,
        sku TEXT,
        barcode TEXT,
        is_available INTEGER DEFAULT 1,
        is_featured INTEGER DEFAULT 0,
        is_bargain INTEGER DEFAULT 0,
        accept_swap INTEGER DEFAULT 0,
        swap_for TEXT,
        rating REAL DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        sales INTEGER DEFAULT 0,
        location_lat REAL,
        location_lng REAL,
        delivery_radius INTEGER DEFAULT 5,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Orders table
    db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_code TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vendor_id INTEGER REFERENCES users(id),
        items TEXT NOT NULL,
        subtotal REAL NOT NULL,
        delivery_fee REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        total REAL NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled', 'refunded')),
        payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')),
        payment_method TEXT DEFAULT 'wallet',
        delivery_method TEXT DEFAULT 'pickup' CHECK(delivery_method IN ('pickup', 'campus_delivery', 'hostel_delivery')),
        delivery_address TEXT,
        delivery_lat REAL,
        delivery_lng REAL,
        notes TEXT,
        mpesa_receipt TEXT,
        estimated_ready DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Transactions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL CHECK(type IN ('topup', 'payment', 'refund', 'voucher', 'transfer', 'withdrawal')),
        amount REAL NOT NULL,
        balance_after REAL NOT NULL,
        description TEXT,
        reference TEXT,
        metadata TEXT,
        status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Vouchers table
    db.exec(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('food', 'market', 'general')),
        amount REAL NOT NULL,
        balance REAL NOT NULL,
        issuer TEXT,
        valid_from DATE,
        valid_until DATE NOT NULL,
        min_order REAL DEFAULT 0,
        max_discount REAL,
        applicable_categories TEXT,
        usage_limit INTEGER DEFAULT 1,
        usage_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'used', 'expired', 'cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Savings goals table
    db.exec(`
      CREATE TABLE IF NOT EXISTS savings_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        target_amount REAL NOT NULL,
        current_amount REAL DEFAULT 0,
        auto_save_amount REAL DEFAULT 0,
        auto_save_frequency TEXT CHECK(auto_save_frequency IN ('daily', 'weekly', 'monthly', 'none')),
        auto_save_day INTEGER,
        category TEXT DEFAULT 'general' CHECK(category IN ('emergency', 'education', 'business', 'tech', 'travel', 'general')),
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'paused')),
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notifications table
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        type TEXT DEFAULT 'general' CHECK(type IN ('order', 'payment', 'voucher', 'savings', 'promotion', 'system', 'chat')),
        data TEXT,
        read INTEGER DEFAULT 0,
        action_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Cart table
    db.exec(`
      CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 1,
        options TEXT,
        UNIQUE(user_id, product_id)
      )
    `);

    // Wishlist table
    db.exec(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(user_id, product_id)
      )
    `);

    // Reviews table
    db.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(id),
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        comment TEXT,
        images TEXT,
        verified_purchase INTEGER DEFAULT 0,
        helpful_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User activity / interactions for AI
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        action TEXT NOT NULL CHECK(action IN ('view', 'add_to_cart', 'purchase', 'wishlist', 'search', 'click')),
        search_query TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // M-Pesa transactions
    db.exec(`
      CREATE TABLE IF NOT EXISTS mpesa_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        phone TEXT NOT NULL,
        amount REAL NOT NULL,
        merchant_request_id TEXT,
        checkout_request_id TEXT,
        mpesa_receipt TEXT,
        result_code TEXT,
        result_desc TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `);

    // Create indexes for performance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_user_activity ON user_activity(user_id, created_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read)`);

    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
    throw err;
  }
};

module.exports = { db, init };
