import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import cron from "node-cron";
import compression from "compression";
import fs from "fs";
import { Debt } from "../types/index.js";
import db from "./models/db.js";
import orderRoutes from "./routes/orders.js";
import userRoutes from "./routes/users.js";
import productRoutes from "./routes/products.js";
import adminRoutes from "./routes/admin.js";
import ratingRoutes from "./routes/ratings.js";

import { AIService } from "./services/aiService.js";
import { KPIService } from "./services/kpiService.js";
import { MonitoringService } from "./services/monitoringService.js";
import { DeployService } from "./services/deployService.js";
import { FirebaseService } from "./services/firebaseService.js";

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
  const firebaseService = FirebaseService.getInstance();

  // Schedulers
  cron.schedule('0 */6 * * *', () => aiService.generateBusinessInsights());
  cron.schedule('0 0 * * *', () => {
    kpiService.calculateKPIs();
    monitoringService.checkHealth();
  });
  cron.schedule('0 */12 * * *', () => aiService.analyzeSecurity());
  cron.schedule('*/1 * * * *', () => monitoringService.checkHealth());

  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  const projectRoot = process.cwd();
  app.use('/uploads', express.static(path.join(projectRoot, 'uploads')));

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
  app.use("/api/ratings", ratingRoutes);

  // Categories
  app.get("/api/categories", async (req, res) => res.json(await db.prepare("SELECT * FROM categories").all()));
  app.post("/api/categories", async (req, res) => {
    const { name } = req.body;
    const result = await db.prepare("INSERT INTO categories (name) VALUES (?) RETURNING id").run(name);
    res.json({ id: result.lastInsertRowid, name });
  });

  // Banners
  app.get("/api/banners", async (req, res) => {
    const banners = await db.prepare("SELECT * FROM banners ORDER BY id DESC").all();
    res.json(banners.map((b: any) => ({
      ...b,
      images: b.images ? JSON.parse(b.images) : []
    })));
  });
  app.post("/api/banners", async (req, res) => {
    const { title, imageUrl, images, videoUrl, link, isActive } = req.body;
    const imagesJson = images ? JSON.stringify(images) : null;
    const result = await db.prepare("INSERT INTO banners (title, imageUrl, images, videoUrl, link, isActive) VALUES (?, ?, ?, ?, ?, ?) RETURNING id").run(
      title, imageUrl, imagesJson, videoUrl || null, link || null, isActive ?? 1
    );
    res.json({ id: result.lastInsertRowid });
  });
  app.put("/api/banners/:id", async (req, res) => {
    const { title, imageUrl, images, videoUrl, link, isActive } = req.body;
    const imagesJson = images ? JSON.stringify(images) : null;
    await db.prepare("UPDATE banners SET title = ?, imageUrl = ?, images = ?, videoUrl = ?, link = ?, isActive = ? WHERE id = ?").run(
      title, imageUrl, imagesJson, videoUrl || null, link || null, isActive, req.params.id
    );
    res.json({ success: true });
  });
  app.delete("/api/banners/:id", async (req, res) => {
    await db.prepare("DELETE FROM banners WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    const settings = await db.prepare("SELECT * FROM settings").all();
    const result: any = {};
    settings.forEach((s: any) => result[s.key] = s.value);
    res.json(result);
  });
  app.post("/api/settings", async (req, res) => {
    const updates = req.body;
    if (typeof updates === 'object' && !updates.key) {
      // Bulk update
      await db.transaction(async () => {
        for (const [key, value] of Object.entries(updates)) {
            // PostgreSQL specific UPSERT syntax
            await db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value").run(key, String(value));
        }
      });
    } else {
      // Single update
      const { key, value } = req.body;
      await db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value").run(key, String(value));
    }
    res.json({ success: true });
  });

  // Geocoding
  app.get("/api/geocoding/reverse", async (req, res) => {
    const { lat, lon, lng } = req.query as any;
    const longitude = lon || lng;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${longitude}&addressdetails=1`, {
        headers: { 'User-Agent': 'UzbechkaApp/1.0' }
      });
      const data = await response.json();
      res.json({ address: data.display_name, street: data.address?.road || data.address?.suburb || '' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  // Shops (Clients registered by Agents)
  app.get("/api/shops", async (req, res) => {
    try {
      const { archived } = req.query;
      let query = `SELECT s.*, u.name as clientName, a.name as agentName 
                   FROM shops s 
                   LEFT JOIN users u ON s.clientId = u.id
                   LEFT JOIN users a ON s.agentId = a.id`;

      if (archived === 'true') {
        query += " WHERE s.isArchived = 1";
      } else if (archived === 'false') {
        query += " WHERE s.isArchived = 0";
      }

      const shops = await db.prepare(query).all();
      res.json(shops);
    } catch (e: any) {
      res.json([]);
    }
  });

  app.post("/api/shops", async (req, res) => {
    const { clientId, name, address, latitude, longitude, agentId } = req.body;
    const lat = latitude || req.body.lat;
    const lng = longitude || req.body.lng;

    if (clientId === undefined || !name) {
      return res.status(400).json({ error: "Name and Client ID are required" });
    }

    const finalAddress = address || (lat && lng ? `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Address not specified');

    try {
      const result = await db.prepare(`
        INSERT INTO shops (name, address, latitude, longitude, clientId, agentId, isArchived) 
        VALUES (?, ?, ?, ?, ?, ?, 0) RETURNING id
      `).run(name, finalAddress, lat || null, lng || null, clientId, agentId || null);

      const shop = await db.prepare("SELECT * FROM shops WHERE id = ?").get(result.lastInsertRowid);
      res.json(shop);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/shops/:id", async (req, res) => {
    const { name, address, latitude, longitude, clientId, agentId } = req.body;
    const lat = latitude || req.body.lat;
    const lng = longitude || req.body.lng;

    try {
      await db.prepare(`
        UPDATE shops 
        SET name = ?, address = ?, latitude = ?, longitude = ?, clientId = ?, agentId = ?
        WHERE id = ?
      `).run(name, address, lat || null, lng || null, clientId, agentId || null, req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/shops/:id/archive", async (req, res) => {
    const { isArchived } = req.body;
    try {
      await db.prepare("UPDATE shops SET isArchived = ? WHERE id = ?").run(isArchived ? 1 : 0, req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/shops/:id", async (req, res) => {
    try {
      await db.prepare("DELETE FROM shops WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Activity Logs
  app.get("/api/activity-logs", async (req, res) => {
    try {
      const logs = await db.prepare("SELECT * FROM activity_logs ORDER BY createdAt DESC LIMIT 100").all();
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/activity-logs", async (req, res) => {
    const { userId, userName, userRole, action, details } = req.body;
    try {
      const result = await db.prepare(`
        INSERT INTO activity_logs (userId, userName, userRole, action, details) 
        VALUES (?, ?, ?, ?, ?) RETURNING id
      `).run(userId, userName, userRole, action, details || null);

      const newLog = await db.prepare("SELECT * FROM activity_logs WHERE id = ?").get(result.lastInsertRowid);

      // Emit via websocket to notify admin instantly
      io.emit('activity_logged', newLog);

      res.json(newLog);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Debts
  app.get("/api/debts", async (req, res) => {
    const query = `
      SELECT d.*, 
             u.name as "clientName", 
             u.phone as "clientPhone",
             (SELECT s.name FROM shops s WHERE s.clientId = d.clientId LIMIT 1) as "shopName"
      FROM debts d 
      JOIN users u ON d.clientId = u.id 
      ORDER BY d.createdAt DESC
    `;
    res.json(await db.prepare(query).all());
  });

  app.post("/api/debts", async (req, res) => {
    const { clientId, amount, dueDate } = req.body;
    try {
      const result = await db.prepare(`
        INSERT INTO debts (clientId, amount, dueDate, status) 
        VALUES (?, ?, ?, 'pending') RETURNING id
      `).run(clientId, amount, dueDate || null);

      const newDebt = await db.prepare("SELECT d.*, u.name as clientName, u.phone as clientPhone FROM debts d JOIN users u ON d.clientId = u.id WHERE d.id = ?").get(result.lastInsertRowid);
      res.json(newDebt);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/debts/:id/pay", async (req, res) => {
    const { payerName } = req.body;
    await db.prepare("UPDATE debts SET status = 'paid', paidAt = CURRENT_TIMESTAMP, payerName = ? WHERE id = ?").run(payerName || null, req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/debts/:id/pay-partial", async (req, res) => {
    const { amountPaid, payerName } = req.body;
    try {
      const debt = await db.prepare("SELECT * FROM debts WHERE id = ?").get(req.params.id) as Debt;
      if (!debt || debt.status === 'paid') {
        return res.status(400).json({ error: "Debt not found or already paid" });
      }

      const newAmount = Math.max(0, debt.amount - amountPaid);

      if (newAmount === 0) {
        await db.prepare("UPDATE debts SET status = 'paid', amount = 0, paidAt = CURRENT_TIMESTAMP, payerName = ? WHERE id = ?").run(payerName || null, req.params.id);
      } else {
        const currentReason = debt.increaseReason ? debt.increaseReason + ` | ` : '';
        const formattedDate = new Date().toLocaleDateString();
        const partialNote = `Частично оплачено ${amountPaid} (${formattedDate}${payerName ? ` от ${payerName}` : ''})`;
        await db.prepare("UPDATE debts SET amount = ?, increaseReason = ? WHERE id = ?").run(newAmount, currentReason + partialNote, req.params.id);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/debts/:id/increase", async (req, res) => {
    const { amount, reason } = req.body;
    await db.prepare("UPDATE debts SET amount = amount + ?, increasedAmount = increasedAmount + ?, increaseReason = ? WHERE id = ?").run(amount, amount, reason, req.params.id);
    res.json({ success: true });
  });

  app.put("/api/debts/:id", async (req, res) => {
    const { amount, dueDate, status, payerName } = req.body;
    try {
      await db.prepare("UPDATE debts SET amount = ?, dueDate = ?, status = ?, payerName = ? WHERE id = ?").run(
        amount, dueDate || null, status, payerName || null, req.params.id
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/debts/:id", async (req, res) => {
    try {
      await db.prepare("DELETE FROM debts WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  // Auth
  app.post("/api/auth/login", async (req, res) => {
    const { phone, password } = req.body;
    try {
      if (phone === '+998936584455' && password === '1210999') {
        let admin = await db.prepare("SELECT * FROM users WHERE phone = ?").get(phone);
        if (!admin) {
          await db.prepare("INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)").run('Super Admin', phone, password, 'admin');
          admin = await db.prepare("SELECT * FROM users WHERE phone = ?").get(phone);
        }
        return res.json(admin);
      }
      const user = await db.prepare("SELECT * FROM users WHERE phone = ? AND password = ?").get(phone, password);
      if (user) res.json(user);
      else res.status(401).json({ error: "Invalid credentials" });
    } catch (e: any) {
      console.error("[Login Error]:", e);
      res.status(500).json({ error: "Login failed", message: e.message });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { name, phone, password, role, carType, carPhoto, photo, agentId } = req.body;
    try {
      console.log(`[Registration Attempt]: phone=${phone}, name=${name}`);
      const finalRole = (phone === '+998936584455') ? 'admin' : (role || 'client');
      
      const insertResult = await db.prepare("INSERT INTO users (name, phone, password, role, carType, carPhoto, photo, agent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id").run(
        name, phone, password, finalRole, carType || null, carPhoto || null, photo || null, agentId || null
      );
      
      const userId = insertResult.lastInsertRowid;
      if (!userId) {
        throw new Error("Failed to retrieve new user ID after insertion");
      }

      const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
      console.log(`[Registration Success]: user_id=${userId}`);
      res.json(user);
    } catch (e: any) {
      console.error("[Registration Error]:", e);
      if (e.message?.includes('users_phone_key') || e.code === '23505') {
        res.status(400).json({ error: "Phone number already registered" });
      } else {
        res.status(500).json({ error: "Registration failed", message: e.message });
      }
    }
  });

  // Stats
  app.get("/api/stats", async (req, res) => {
    let totalRevenue = (await db.prepare("SELECT SUM(totalPrice) as total FROM orders WHERE paymentStatus = 'paid'").get())?.total || 0;
    let totalOrders = (await db.prepare("SELECT COUNT(*) as count FROM orders").get())?.count || 0;
    let totalUsers = (await db.prepare("SELECT COUNT(*) as count FROM users").get())?.count || 0;
    let totalProducts = (await db.prepare("SELECT COUNT(*) as count FROM products").get())?.count || 0;
    let salesByCategory = await db.prepare(`
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
    const botTokenObj = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get();
    const chatIdObj = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_chat_id'").get();
    const botToken = botTokenObj?.value;
    const chatId = chatIdObj?.value;
    if (!botToken || !chatId) return res.status(400).json({ error: "Telegram settings missing" });
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
      });
      res.json(await response.json());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Upload (Temporary, will be moved to firebase)
  app.post("/api/upload", upload.single('photo'), (req, res) => {
    const type = req.body.type || 'products';
    res.json({ url: `/uploads/${type}/${req.file?.filename}` });
  });

  app.post("/api/courier/upload-proof", upload.single('photo'), async (req, res) => {
    const { orderId } = req.body;
    const imageUrl = `/uploads/proofs/${req.file?.filename}`;
    await db.prepare("UPDATE orders SET deliveryPhoto = ?, orderStatus = 'delivered' WHERE id = ?").run(imageUrl, orderId);
    res.json({ success: true, imageUrl });
  });

  // Socket.io
  io.on("connection", (socket) => {
    socket.on("update_location", async (data) => {
      const { userId, lat, lng, role, speed } = data;
      await db.prepare("UPDATE users SET lat = ?, lng = ?, lastSeen = CURRENT_TIMESTAMP WHERE id = ?").run(lat, lng, userId);
      await db.prepare("INSERT INTO location_history (userId, lat, lng) VALUES (?, ?, ?)").run(userId, lat, lng);
      if (role === 'courier') {
        await db.prepare(`
          INSERT INTO courier_locations (courier_id, latitude, longitude, speed, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT (courier_id) DO UPDATE SET
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            speed = EXCLUDED.speed,
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
    app.use(express.static(path.join(projectRoot, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(projectRoot, "dist/index.html")));
  }

  // Error logging middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[Global Error] ${req.method} ${req.url}:`, err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message,
      path: req.url 
    });
  });

  const port = process.env.PORT || 3000;
  httpServer.listen(Number(port), "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(console.error);
