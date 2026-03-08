import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isElectron = process.env.IS_ELECTRON === 'true';
const dbPath = isElectron 
  ? path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share"), 'uzbechka.db')
  : path.join(__dirname, '../../../../uzbechka.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Ensure upload directories exist
const uploadDirs = [
  'uploads/products',
  'uploads/users',
  'uploads/banners',
  'uploads/vehicles',
  'uploads/proofs'
];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '../../../../', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

try {
  // Initialize database
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'client',
      carType TEXT,
      carPhoto TEXT,
      photo TEXT,
      lat REAL,
      lng REAL,
      lastSeen DATETIME,
      address TEXT,
      agent_id INTEGER,
      FOREIGN KEY (agent_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      discountPrice REAL,
      categoryId INTEGER,
      image TEXT,
      videoUrl TEXT,
      description TEXT,
      stock INTEGER DEFAULT 0,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      imageUrl TEXT NOT NULL,
      videoUrl TEXT,
      link TEXT,
      isActive INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      agentId INTEGER,
      courierId INTEGER,
      totalPrice REAL NOT NULL,
      paymentType TEXT NOT NULL,
      paymentStatus TEXT NOT NULL DEFAULT 'pending',
      collectionStatus TEXT NOT NULL DEFAULT 'pending',
      orderStatus TEXT NOT NULL DEFAULT 'new',
      location TEXT,
      latitude REAL,
      longitude REAL,
      deliveryPhoto TEXT,
      invoicePhoto TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES users(id),
      FOREIGN KEY (agentId) REFERENCES users(id),
      FOREIGN KEY (courierId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      imageUrl TEXT NOT NULL,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      orderId INTEGER,
      amount REAL NOT NULL,
      increasedAmount REAL DEFAULT 0,
      increaseReason TEXT,
      dueDate DATETIME,
      status TEXT NOT NULL DEFAULT 'pending',
      paidAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES users(id),
      FOREIGN KEY (orderId) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS courier_locations (
      courier_id INTEGER PRIMARY KEY,
      latitude REAL,
      longitude REAL,
      speed REAL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (courier_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS business_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS profit_forecast (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employee_kpi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      score REAL NOT NULL DEFAULT 0,
      month TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS system_health_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT NOT NULL,
      issue TEXT NOT NULL,
      severity TEXT NOT NULL,
      auto_fix_applied INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS security_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS system_errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      stack TEXT,
      fixed INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS location_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_salary_config (
      userId INTEGER PRIMARY KEY,
      baseSalary REAL DEFAULT 0,
      commissionPercent REAL DEFAULT 0,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS agent_commission (
      agent_id INTEGER PRIMARY KEY,
      percent REAL DEFAULT 0,
      FOREIGN KEY (agent_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS salaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      amount REAL NOT NULL,
      month TEXT NOT NULL,
      paidAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    -- Seed default settings
    INSERT OR IGNORE INTO settings (key, value) VALUES ('app_name', 'Uzbechka');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('contact_phone', '+998901234567');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('delivery_fee', '15000');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('min_order', '50000');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('click_card', '8600 0000 0000 0000');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('payme_card', '8600 1111 1111 1111');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('uzum_nasiya_card', '8600 2222 2222 2222');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_card', '8600 3333 3333 3333');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('address', 'Бухара, ул. Мустакиллик, 1');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('voice_enabled', 'true');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('telegram_bot_token', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('telegram_chat_id', '');
  `);

  // Migrations
  try { db.prepare("ALTER TABLE users ADD COLUMN agent_id INTEGER").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE users ADD COLUMN address TEXT").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE orders ADD COLUMN deliveryPhoto TEXT").run(); } catch (e) {}
} catch (error) {
  console.error("Database initialization failed:", error);
}

export default db;
