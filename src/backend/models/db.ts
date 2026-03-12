import { PgDatabase } from './pg-wrapper.js';
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

const db = new PgDatabase();

// Initialize Database asynchronously
const initDb = async () => {
  try {
    // Tests connection internally via simple query
    await db.exec('SELECT 1');
    
    // Core tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'client',
        "carType" TEXT,
        "carPhoto" TEXT,
        photo TEXT,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        "lastSeen" TIMESTAMP,
        address TEXT,
        agent_id INTEGER,
        rating DOUBLE PRECISION DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        FOREIGN KEY (agent_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price DOUBLE PRECISION NOT NULL,
        "costPrice" DOUBLE PRECISION DEFAULT 0,
        "discountPrice" DOUBLE PRECISION,
        "categoryId" INTEGER,
        image TEXT,
        "videoUrl" TEXT,
        description TEXT,
        stock INTEGER DEFAULT 0,
        rating DOUBLE PRECISION DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        FOREIGN KEY ("categoryId") REFERENCES categories(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        title TEXT,
        "imageUrl" TEXT NOT NULL,
        images TEXT, -- JSON array of image URLs
        "videoUrl" TEXT,
        link TEXT,
        "isActive" INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        "clientId" INTEGER NOT NULL,
        "agentId" INTEGER,
        "courierId" INTEGER,
        "totalPrice" DOUBLE PRECISION NOT NULL,
        "paymentType" TEXT NOT NULL,
        "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
        "collectionStatus" TEXT NOT NULL DEFAULT 'pending',
        "orderStatus" TEXT NOT NULL DEFAULT 'new',
        location TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        "deliveryPhoto" TEXT,
        "invoicePhoto" TEXT,
        is_rated INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("clientId") REFERENCES users(id),
        FOREIGN KEY ("agentId") REFERENCES users(id),
        FOREIGN KEY ("courierId") REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        "orderId" INTEGER NOT NULL,
        "productId" INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price DOUBLE PRECISION NOT NULL,
        FOREIGN KEY ("orderId") REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY ("productId") REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS product_images (
        id SERIAL PRIMARY KEY,
        "productId" INTEGER NOT NULL,
        "imageUrl" TEXT NOT NULL,
        FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS debts (
        id SERIAL PRIMARY KEY,
        "clientId" INTEGER NOT NULL,
        "orderId" INTEGER,
        amount DOUBLE PRECISION NOT NULL,
        "increasedAmount" DOUBLE PRECISION DEFAULT 0,
        "increaseReason" TEXT,
        "dueDate" TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'pending',
        "paidAt" TIMESTAMP,
        "payerName" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("clientId") REFERENCES users(id),
        FOREIGN KEY ("orderId") REFERENCES orders(id)
      );

      CREATE TABLE IF NOT EXISTS courier_locations (
        courier_id INTEGER PRIMARY KEY,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        speed DOUBLE PRECISION,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (courier_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        category TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS business_insights (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS profit_forecast (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS employee_kpi (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        score DOUBLE PRECISION NOT NULL DEFAULT 0,
        month TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS system_health_logs (
        id SERIAL PRIMARY KEY,
        service TEXT NOT NULL,
        issue TEXT NOT NULL,
        severity TEXT NOT NULL,
        auto_fix_applied INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS security_alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS system_errors (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        stack TEXT,
        fixed INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS location_history (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS user_salary_config (
        "userId" INTEGER PRIMARY KEY,
        "baseSalary" DOUBLE PRECISION DEFAULT 0,
        "commissionPercent" DOUBLE PRECISION DEFAULT 0,
        FOREIGN KEY ("userId") REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS agent_commission (
        agent_id INTEGER PRIMARY KEY,
        percent DOUBLE PRECISION DEFAULT 0,
        FOREIGN KEY (agent_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        "orderId" INTEGER NOT NULL,
        "targetId" INTEGER NOT NULL,
        "targetType" TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("orderId") REFERENCES orders(id)
      );

      CREATE TABLE IF NOT EXISTS salaries (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        month TEXT NOT NULL,
        "paidAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES users(id)
      );
      
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "userName" TEXT NOT NULL,
        "userRole" TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS shops (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        "clientId" INTEGER NOT NULL,
        "agentId" INTEGER,
        "isArchived" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("clientId") REFERENCES users(id),
        FOREIGN KEY ("agentId") REFERENCES users(id)
      );
    `);

    // Indices
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_agent_id ON users(agent_id);
      
      CREATE INDEX IF NOT EXISTS idx_orders_clientId ON orders("clientId");
      CREATE INDEX IF NOT EXISTS idx_orders_agentId ON orders("agentId");
      CREATE INDEX IF NOT EXISTS idx_orders_courierId ON orders("courierId");
      CREATE INDEX IF NOT EXISTS idx_orders_paymentStatus ON orders("paymentStatus");
      CREATE INDEX IF NOT EXISTS idx_orders_orderStatus ON orders("orderStatus");
      CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders("createdAt");
      
      CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items("orderId");
      CREATE INDEX IF NOT EXISTS idx_order_items_productId ON order_items("productId");
      
      CREATE INDEX IF NOT EXISTS idx_debts_clientId ON debts("clientId");
      CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
      CREATE INDEX IF NOT EXISTS idx_debts_createdAt ON debts("createdAt");
      
      CREATE INDEX IF NOT EXISTS idx_location_history_userId ON location_history("userId");
      CREATE INDEX IF NOT EXISTS idx_location_history_createdAt ON location_history("createdAt");
      
      CREATE INDEX IF NOT EXISTS idx_shops_clientId ON shops("clientId");
      CREATE INDEX IF NOT EXISTS idx_shops_agentId ON shops("agentId");
      CREATE INDEX IF NOT EXISTS idx_shops_isArchived ON shops("isArchived");
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
      await db.prepare("INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING").run(key, value);
    }
    
    console.log("PostgreSQL Database initialized successfully");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
};

initDb();

export default db;
