import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import cron from "node-cron";
import fs from "fs";

import db from "./models/db.js";
import orderRoutes from "./routes/orders.js";
import userRoutes from "./routes/users.js";
import productRoutes from "./routes/products.js";
import adminRoutes from "./routes/admin.js";

import { AIService } from "./services/aiService.js";
import { KPIService } from "./services/kpiService.js";
import { MonitoringService } from "./services/monitoringService.js";
import { DeployService } from "./services/deployService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    monitoringService.checkHealth();
  });
  cron.schedule('0 */12 * * *', () => aiService.analyzeSecurity());
  cron.schedule('*/1 * * * *', () => monitoringService.checkHealth());

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use('/uploads', express.static(path.join(__dirname, '../../../../uploads')));

  // Multer setup
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const type = req.body.type || 'products';
      cb(null, path.join(__dirname, '../../../../uploads', type));
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  });
  const upload = multer({ storage });

  // Routes
  app.use("/api/orders", orderRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/admin", adminRoutes);

  // Categories
  app.get("/api/categories", (req, res) => res.json(db.prepare("SELECT * FROM categories").all()));
  app.post("/api/categories", (req, res) => {
    const { name } = req.body;
    const result = db.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
    res.json({ id: result.lastInsertRowid, name });
  });

  // Banners
  app.get("/api/banners", (req, res) => res.json(db.prepare("SELECT * FROM banners WHERE isActive = 1").all()));
  app.post("/api/banners", (req, res) => {
    const { title, imageUrl, videoUrl, link } = req.body;
    const result = db.prepare("INSERT INTO banners (title, imageUrl, videoUrl, link) VALUES (?, ?, ?, ?)").run(title, imageUrl, videoUrl || null, link || null);
    res.json({ id: result.lastInsertRowid });
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const result: any = {};
    settings.forEach((s: any) => result[s.key] = s.value);
    res.json(result);
  });
  app.post("/api/settings", (req, res) => {
    const updates = req.body;
    if (typeof updates === 'object' && !updates.key) {
      // Bulk update
      const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
      db.transaction(() => {
        for (const [key, value] of Object.entries(updates)) {
          stmt.run(key, String(value));
        }
      })();
    } else {
      // Single update
      const { key, value } = req.body;
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, String(value));
    }
    res.json({ success: true });
  });

  // Geocoding
  app.get("/api/geocoding/reverse", async (req, res) => {
    const { lat, lon } = req.query;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`, {
        headers: { 'User-Agent': 'UzbechkaApp/1.0' }
      });
      const data = await response.json();
      res.json({ address: data.display_name, street: data.address?.road || data.address?.suburb || '' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Shops (Clients registered by Agents)
  app.get("/api/shops", (req, res) => {
    const shops = db.prepare("SELECT * FROM users WHERE role = 'client'").all();
    res.json(shops);
  });
  app.post("/api/shops", (req, res) => {
    const { clientId, name, phone, password, address, latitude, longitude, agentId } = req.body;
    const lat = latitude || req.body.lat;
    const lng = longitude || req.body.lng;

    if (clientId) {
      try {
        db.prepare("UPDATE users SET name = ?, address = ?, lat = ?, lng = ?, agent_id = ? WHERE id = ?").run(
          name, address, lat, lng, agentId, clientId
        );
        const shop = db.prepare("SELECT * FROM users WHERE id = ?").get(clientId);
        res.json(shop);
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
    } else {
      try {
        const result = db.prepare("INSERT INTO users (name, phone, password, role, address, lat, lng, agent_id) VALUES (?, ?, ?, 'client', ?, ?, ?, ?)").run(
          name, phone, password || '123456', address || null, lat || null, lng || null, agentId || null
        );
        const shop = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
        res.json(shop);
      } catch (e) {
        res.status(400).json({ error: "Phone number already registered" });
      }
    }
  });

  // Debts
  app.get("/api/debts", (req, res) => res.json(db.prepare("SELECT d.*, u.name as clientName, u.phone as clientPhone FROM debts d JOIN users u ON d.clientId = u.id ORDER BY d.createdAt DESC").all()));
  app.patch("/api/debts/:id/pay", (req, res) => {
    db.prepare("UPDATE debts SET status = 'paid', paidAt = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });
  app.patch("/api/debts/:id/increase", (req, res) => {
    const { amount, reason } = req.body;
    db.prepare("UPDATE debts SET amount = amount + ?, increasedAmount = increasedAmount + ?, increaseReason = ? WHERE id = ?").run(amount, amount, reason, req.params.id);
    res.json({ success: true });
  });

  // Auth
  app.post("/api/auth/login", (req, res) => {
    const { phone, password } = req.body;
    if (phone === '+998936584455' && password === '1210999') {
      let admin = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone);
      if (!admin) {
        db.prepare("INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)").run('Super Admin', phone, password, 'admin');
        admin = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone);
      }
      return res.json(admin);
    }
    const user = db.prepare("SELECT * FROM users WHERE phone = ? AND password = ?").get(phone, password);
    if (user) res.json(user);
    else res.status(401).json({ error: "Invalid credentials" });
  });

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

  // Stats
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
    res.json({ revenue: totalRevenue, orders: totalOrders, users: totalUsers, products: totalProducts, salesByCategory });
  });

  // Telegram
  app.post("/api/telegram/send", async (req, res) => {
    const { message } = req.body;
    const botToken = db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get()?.value;
    const chatId = db.prepare("SELECT value FROM settings WHERE key = 'telegram_chat_id'").get()?.value;
    if (!botToken || !chatId) return res.status(400).json({ error: "Telegram settings missing" });
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
      });
      res.json(await response.json());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Upload
  app.post("/api/upload", upload.single('photo'), (req, res) => {
    const type = req.body.type || 'products';
    res.json({ url: `/uploads/${type}/${req.file?.filename}` });
  });

  app.post("/api/courier/upload-proof", upload.single('photo'), (req, res) => {
    const { orderId } = req.body;
    const imageUrl = `/uploads/proofs/${req.file?.filename}`;
    db.prepare("UPDATE orders SET deliveryPhoto = ?, orderStatus = 'delivered' WHERE id = ?").run(imageUrl, orderId);
    res.json({ success: true, imageUrl });
  });

  // Socket.io
  io.on("connection", (socket) => {
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
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
      root: path.join(__dirname, "../..")
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "../../dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "../../dist/index.html")));
  }

  httpServer.listen(3000, "0.0.0.0", () => {
    console.log("Server running on http://localhost:3000");
  });
}

startServer().catch(console.error);
