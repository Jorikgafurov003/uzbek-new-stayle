import { SqliteDatabase } from './sqlite-wrapper.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = process.cwd();
const uploadDirs = [
  'uploads/products',
  'uploads/users',
  'uploads/banners',
  'uploads/vehicles',
  'uploads/proofs'
];
uploadDirs.forEach(dir => {
  const fullPath = path.join(projectRoot, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

import dotenv from 'dotenv';
dotenv.config();

const db = new SqliteDatabase();

// Initialize Database asynchronously
const initDb = async () => {
  try {
    // Tests connection internally via simple query
    await db.exec('SELECT 1');
    
    // Core tables
    await db.exec(`
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
        rating REAL DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        firebase_uid TEXT UNIQUE,
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
        costPrice REAL DEFAULT 0,
        discountPrice REAL,
        categoryId INTEGER,
        image TEXT,
        videoUrl TEXT,
        description TEXT,
        stock INTEGER DEFAULT 0,
        rating REAL DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS banners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        imageUrl TEXT NOT NULL,
        images TEXT, -- JSON array of image URLs
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
        is_rated INTEGER DEFAULT 0,
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
        payerName TEXT,
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

      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId INTEGER NOT NULL,
        targetId INTEGER NOT NULL,
        targetType TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (orderId) REFERENCES orders(id)
      );

      CREATE TABLE IF NOT EXISTS salaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        amount REAL NOT NULL,
        month TEXT NOT NULL,
        paidAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      );
      
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        userName TEXT NOT NULL,
        userRole TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS shops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        clientId INTEGER NOT NULL,
        agentId INTEGER,
        isArchived INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (clientId) REFERENCES users(id),
        FOREIGN KEY (agentId) REFERENCES users(id)
      );
    `);

    // Indices
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_agent_id ON users(agent_id);
      
      CREATE INDEX IF NOT EXISTS idx_orders_clientId ON orders(clientId);
      CREATE INDEX IF NOT EXISTS idx_orders_agentId ON orders(agentId);
      CREATE INDEX IF NOT EXISTS idx_orders_courierId ON orders(courierId);
      CREATE INDEX IF NOT EXISTS idx_orders_paymentStatus ON orders(paymentStatus);
      CREATE INDEX IF NOT EXISTS idx_orders_orderStatus ON orders(orderStatus);
      CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders(createdAt);
      
      CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items(orderId);
      CREATE INDEX IF NOT EXISTS idx_order_items_productId ON order_items(productId);
      
      CREATE INDEX IF NOT EXISTS idx_debts_clientId ON debts(clientId);
      CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
      CREATE INDEX IF NOT EXISTS idx_debts_createdAt ON debts(createdAt);
      
      CREATE INDEX IF NOT EXISTS idx_location_history_userId ON location_history(userId);
      CREATE INDEX IF NOT EXISTS idx_location_history_createdAt ON location_history(createdAt);
      
      CREATE INDEX IF NOT EXISTS idx_shops_clientId ON shops(clientId);
      CREATE INDEX IF NOT EXISTS idx_shops_agentId ON shops(agentId);
      CREATE INDEX IF NOT EXISTS idx_shops_isArchived ON shops(isArchived);
    `);

    // Seed Data
    const seedSettings = [
      ['app_name', 'Uzbechka'],
      ['contact_phone', '+998901234567'],
      ['delivery_fee', '15000'],
      ['min_order', '50000'],
      ['click_card', '8600 0000 0000 0000'],
      ['payme_card', '8600 1111 1111 1111'],
      ['uzum_nasiya_card', '8600 2222 2222 2222'],
      ['admin_card', '8600 3333 3333 3333'],
      ['address', 'Бухара, ул. Мустакиллик, 1'],
      ['warehouse_lat', '39.7747'],
      ['warehouse_lng', '64.4286'],
      ['voice_enabled', 'true'],
      ['telegram_bot_token', ''],
      ['telegram_chat_id', '']
    ];

    for (const [key, value] of seedSettings) {
      await db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(key, value);
    }

    // Seed categories
    const seedCategories = ['Хлеб и выпечка', 'Торты', 'Пирожные', 'Напитки', 'Другое'];
    for (const catName of seedCategories) {
      await db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)").run(catName);
    }

    // Seed example products
    const catRow = await db.prepare("SELECT id FROM categories WHERE name = 'Хлеб и выпечка' LIMIT 1").get() as any;
    if (catRow) {
      const seedProducts = [
        ['Лепёшка', 8000, 'Свежая лепёшка из тандыра', catRow.id],
        ['Самса', 5000, 'Самса с мясом', catRow.id],
      ];
      for (const [name, price, description, categoryId] of seedProducts) {
        await db.prepare(`
          INSERT OR IGNORE INTO products (name, price, description, categoryId, stock)
          VALUES (?, ?, ?, ?, 50)
        `).run(name, price, description, categoryId);
      }
    }

    // Default admin if not exists
    await db.prepare(`
      INSERT OR IGNORE INTO users (name, phone, role, password) 
      VALUES (?, ?, ?, ?)
    `).run('Admin', '998901234567', 'admin', 'admin123');

    console.log("SQLite Database initialized successfully");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
};

initDb();

export default db;
