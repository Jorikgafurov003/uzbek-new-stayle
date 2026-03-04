import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import cron from "node-cron";
import fs from "fs";

import { AIService } from "./src/server/aiService.js";
import { KPIService } from "./src/server/kpiService.js";
import { MonitoringService } from "./src/server/monitoringService.js";
import { DeployService } from "./src/server/deployService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isElectron = process.env.IS_ELECTRON === 'true';
const dbPath = isElectron 
  ? path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share"), 'uzbechka.db')
  : "uzbechka.db";

const db = new Database(dbPath);

// Ensure upload directories exist
const uploadDirs = [
  'uploads/products',
  'uploads/users',
  'uploads/banners',
  'uploads/vehicles',
  'uploads/proofs'
];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type || 'products';
    cb(null, `uploads/${type}`);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

try {
  // Initialize database
  console.log("Initializing database at:", dbPath);
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

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      orderId INTEGER,
      amount REAL NOT NULL,
      dueDate DATETIME,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES users(id),
      FOREIGN KEY (orderId) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS location_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS system_errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT,
      route TEXT,
      stack TEXT,
      fixed INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS business_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      summary TEXT,
      recommendation TEXT,
      risk_level TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employee_kpi (
      user_id INTEGER PRIMARY KEY,
      role TEXT,
      score REAL,
      level TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS profit_forecast (
      date TEXT PRIMARY KEY,
      expected_orders INTEGER,
      expected_revenue REAL,
      confidence REAL
    );

    CREATE TABLE IF NOT EXISTS system_health_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT,
      issue TEXT,
      severity TEXT,
      auto_fix_applied INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS security_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT,
      risk_score REAL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS ratings (
      user_id INTEGER PRIMARY KEY,
      role TEXT,
      rating REAL DEFAULT 5,
      total_orders INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS agent_commission (
      agent_id INTEGER PRIMARY KEY,
      percent REAL DEFAULT 5,
      FOREIGN KEY (agent_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS courier_locations (
      courier_id INTEGER PRIMARY KEY,
      latitude REAL,
      longitude REAL,
      speed REAL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (courier_id) REFERENCES users(id)
    );
  `);

  // Migrations for existing tables
  try { db.prepare("ALTER TABLE users ADD COLUMN agent_id INTEGER").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE orders ADD COLUMN deliveryPhoto TEXT").run(); } catch (e) {}

  console.log("Database initialized successfully");
} catch (error) {
  console.error("Database initialization failed CRITICAL:", error);
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  const aiService = new AIService(db);
  const kpiService = new KPIService(db);
  const monitoringService = new MonitoringService(db, io);
  const deployService = new DeployService();

  // Schedulers
  cron.schedule('0 */6 * * *', () => aiService.generateBusinessInsights());
  cron.schedule('0 0 * * *', () => {
    kpiService.calculateKPIs();
    aiService.generateProfitForecast();
  });
  cron.schedule('*/1 * * * *', () => monitoringService.checkHealth());
  cron.schedule('0 */12 * * *', () => aiService.analyzeSecurity());

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use('/uploads', express.static('uploads'));

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("update_location", (data) => {
      const { userId, lat, lng, role, speed } = data;
      db.prepare("UPDATE users SET lat = ?, lng = ?, lastSeen = CURRENT_TIMESTAMP WHERE id = ?").run(lat, lng, userId);
      db.prepare("INSERT INTO location_history (userId, lat, lng) VALUES (?, ?, ?)").run(userId, lat, lng);
      
      if (role === 'courier') {
        db.prepare(`
          INSERT INTO courier_locations (courier_id, latitude, longitude, speed, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(courier_id) DO UPDATE SET
            latitude = excluded.latitude,
            longitude = excluded.longitude,
            speed = excluded.speed,
            updated_at = CURRENT_TIMESTAMP
        `).run(userId, lat, lng, speed || 0);
      }
      
      io.emit("location_updated", { userId, lat, lng, role, speed });
    });

    socket.on("new_order", (order) => {
      io.emit("order_created", order);
      io.emit("voice_alert", { message: "Новый заказ создан" });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  // API Routes
  app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

  // Auth
  app.post("/api/auth/register", (req, res) => {
    const { name, phone, password, role, carType, carPhoto, photo, agentId } = req.body;
    try {
      const result = db.prepare("INSERT INTO users (name, phone, password, role, carType, carPhoto, photo, agent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        name, phone, password, role || 'client', carType || null, carPhoto || null, photo || null, agentId || null
      );
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
      res.json(user);
    } catch (e) {
      res.status(400).json({ error: "Phone number already registered" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { phone, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE phone = ? AND password = ?").get(phone, password);
    if (user) res.json(user);
    else res.status(401).json({ error: "Invalid credentials" });
  });

  // AI & Admin Advanced
  app.get("/api/admin/ai-insights", (req, res) => {
    const insights = db.prepare("SELECT * FROM business_insights ORDER BY createdAt DESC LIMIT 10").all();
    res.json(insights);
  });

  app.get("/api/admin/profit-forecast", (req, res) => {
    const forecast = db.prepare("SELECT * FROM profit_forecast ORDER BY date ASC").all();
    res.json(forecast);
  });

  app.get("/api/admin/kpi-leaderboard", (req, res) => {
    const leaderboard = db.prepare(`
      SELECT k.*, u.name, u.photo
      FROM employee_kpi k
      JOIN users u ON k.user_id = u.id
      ORDER BY k.score DESC
    `).all();
    res.json(leaderboard);
  });

  app.get("/api/admin/system-health", (req, res) => {
    const logs = db.prepare("SELECT * FROM system_health_logs ORDER BY createdAt DESC LIMIT 50").all();
    res.json(logs);
  });

  app.get("/api/admin/security-alerts", (req, res) => {
    const alerts = db.prepare(`
      SELECT s.*, u.name as userName
      FROM security_alerts s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.createdAt DESC LIMIT 50
    `).all();
    res.json(alerts);
  });

  app.get("/api/stats", (req, res) => {
    const totalRevenue = db.prepare("SELECT SUM(totalPrice) as total FROM orders WHERE paymentStatus = 'paid'").get().total || 0;
    const totalOrders = db.prepare("SELECT COUNT(*) as count FROM orders").get().count || 0;
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get().count || 0;
    const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products").get().count || 0;
    
    const salesByCategory = db.prepare(`
      SELECT c.name, SUM(oi.price * oi.quantity) as value
      FROM order_items oi
      JOIN products p ON oi.productId = p.id
      JOIN categories c ON p.categoryId = c.id
      JOIN orders o ON oi.orderId = o.id
      WHERE o.paymentStatus = 'paid'
      GROUP BY c.id
    `).all();

    res.json({
      revenue: totalRevenue,
      orders: totalOrders,
      users: totalUsers,
      products: totalProducts,
      salesByCategory
    });
  });

  app.get("/api/debts", (req, res) => {
    const debts = db.prepare(`
      SELECT d.*, u.name as clientName, u.phone as clientPhone
      FROM debts d
      JOIN users u ON d.clientId = u.id
      ORDER BY d.createdAt DESC
    `).all();
    res.json(debts);
  });

  app.get("/api/system-errors", (req, res) => {
    const errors = db.prepare("SELECT * FROM system_errors ORDER BY createdAt DESC LIMIT 50").all();
    res.json(errors);
  });

  app.patch("/api/system-errors/:id", (req, res) => {
    const { fixed } = req.body;
    db.prepare("UPDATE system_errors SET fixed = ? WHERE id = ?").run(fixed, req.params.id);
    res.json({ success: true });
  });

  app.post("/api/admin/deploy-update", async (req, res) => {
    try {
      await deployService.generateDeployFiles();
      // await deployService.deployUpdate(); // Disabled for safety in preview
      res.json({ success: true, message: "Deployment files generated" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/top-stats", (req, res) => {
    const topAgent = db.prepare(`
      SELECT u.id, u.name, u.photo, COUNT(o.id) as count
      FROM orders o
      JOIN users u ON o.agentId = u.id
      WHERE o.createdAt >= date('now', 'start of month')
      GROUP BY u.id ORDER BY count DESC LIMIT 1
    `).get();

    const topCourier = db.prepare(`
      SELECT u.id, u.name, u.photo, COUNT(o.id) as count
      FROM orders o
      JOIN users u ON o.courierId = u.id
      WHERE o.orderStatus = 'delivered' AND o.createdAt >= date('now', 'start of month')
      GROUP BY u.id ORDER BY count DESC LIMIT 1
    `).get();

    const topClient = db.prepare(`
      SELECT u.id, u.name, u.photo, COUNT(o.id) as count
      FROM orders o
      JOIN users u ON o.clientId = u.id
      WHERE o.createdAt >= date('now', 'start of month')
      GROUP BY u.id ORDER BY count DESC LIMIT 1
    `).get();

    res.json({ topAgent, topCourier, topClient });
  });

  app.get("/api/admin/salary-report", (req, res) => {
    const report = db.prepare(`
      SELECT u.name as agent_name, SUM(o.totalPrice) as total_sales, c.percent as commission_percent,
             (SUM(o.totalPrice) * c.percent / 100) as salary
      FROM users u
      JOIN agent_commission c ON u.id = c.agent_id
      JOIN orders o ON u.id = o.agentId
      WHERE o.paymentStatus = 'paid'
      GROUP BY u.id
    `).all();
    res.json(report);
  });

  app.post("/api/admin/set-commission", (req, res) => {
    const { agentId, percent } = req.body;
    db.prepare("INSERT INTO agent_commission (agent_id, percent) VALUES (?, ?) ON CONFLICT(agent_id) DO UPDATE SET percent = excluded.percent").run(agentId, percent);
    res.json({ success: true });
  });

  // Courier Proof Upload
  app.post("/api/courier/upload-proof", upload.single('photo'), (req, res) => {
    const { orderId } = req.body;
    const imageUrl = `/uploads/proofs/${req.file?.filename}`;
    db.prepare("UPDATE orders SET deliveryPhoto = ?, orderStatus = 'delivered' WHERE id = ?").run(imageUrl, orderId);
    res.json({ success: true, imageUrl });
  });

  // Standard CRUD (truncated for brevity, but keeping core logic)
  app.get("/api/products", (req, res) => res.json(db.prepare("SELECT p.*, c.name as categoryName FROM products p LEFT JOIN categories c ON p.categoryId = c.id").all()));
  app.get("/api/orders", (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, u.name as clientName, u.phone as clientPhone, a.name as agentName, cr.name as courierName
      FROM orders o
      JOIN users u ON o.clientId = u.id
      LEFT JOIN users a ON o.agentId = a.id
      LEFT JOIN users cr ON o.courierId = cr.id
      ORDER BY o.createdAt DESC
    `).all();
    res.json(orders.map((o: any) => ({ ...o, items: db.prepare("SELECT oi.*, p.name as productName FROM order_items oi JOIN products p ON oi.productId = p.id WHERE oi.orderId = ?").all(o.id) })));
  });

  app.post("/api/orders", (req, res) => {
    const { clientId, agentId, items, totalPrice, paymentType, location, latitude, longitude } = req.body;
    const info = db.prepare("INSERT INTO orders (clientId, agentId, totalPrice, paymentType, location, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      clientId, agentId || null, totalPrice, paymentType, location, latitude || null, longitude || null
    );
    const orderId = info.lastInsertRowid;
    items.forEach((item: any) => db.prepare("INSERT INTO order_items (orderId, productId, quantity, price) VALUES (?, ?, ?, ?)").run(orderId, item.id || item.productId, item.quantity, item.price));
    res.json({ id: orderId });
  });

  app.patch("/api/orders/:id", (req, res) => {
    const updates = Object.entries(req.body).map(([k, v]) => `${k} = ?`).join(", ");
    db.prepare(`UPDATE orders SET ${updates} WHERE id = ?`).run(...Object.values(req.body), req.params.id);
    res.json({ success: true });
  });

  app.get("/api/users", (req, res) => res.json(db.prepare("SELECT * FROM users").all()));
  app.get("/api/categories", (req, res) => res.json(db.prepare("SELECT * FROM categories").all()));
  app.get("/api/banners", (req, res) => res.json(db.prepare("SELECT * FROM banners WHERE isActive = 1").all()));
  app.get("/api/settings", (req, res) => {
    const s = db.prepare("SELECT * FROM settings").all();
    res.json((s as any[]).reduce((a, c) => ({ ...a, [c.key]: c.value }), {}));
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true, hmr: false }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  }

  httpServer.listen(3000, "0.0.0.0", () => console.log("Server running on port 3000"));
}

startServer().catch(console.error);
