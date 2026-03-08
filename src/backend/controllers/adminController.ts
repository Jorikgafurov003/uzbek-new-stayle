import db from '../models/db.js';

export const getAIInsights = (req, res) => {
  const insights = db.prepare("SELECT * FROM business_insights ORDER BY createdAt DESC LIMIT 10").all();
  res.json(insights);
};

export const getProfitForecast = (req, res) => {
  const forecast = db.prepare("SELECT * FROM profit_forecast ORDER BY date ASC").all();
  res.json(forecast);
};

export const getKPILeaderboard = (req, res) => {
  const leaderboard = db.prepare(`
    SELECT k.*, u.name, u.photo
    FROM employee_kpi k
    JOIN users u ON k.user_id = u.id
    ORDER BY k.score DESC
  `).all();
  res.json(leaderboard);
};

export const getSystemHealth = (req, res) => {
  const logs = db.prepare("SELECT * FROM system_health_logs ORDER BY createdAt DESC LIMIT 50").all();
  res.json(logs);
};

export const getSecurityAlerts = (req, res) => {
  const alerts = db.prepare(`
    SELECT s.*, u.name as userName
    FROM security_alerts s
    LEFT JOIN users u ON s.user_id = u.id
    ORDER BY s.createdAt DESC LIMIT 50
  `).all();
  res.json(alerts);
};

export const getTopStats = (req, res) => {
  try {
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

    const topSeller = db.prepare(`
      SELECT p.id, p.name, p.image, SUM(oi.quantity) as count
      FROM order_items oi
      JOIN products p ON oi.productId = p.id
      JOIN orders o ON oi.orderId = o.id
      WHERE o.createdAt >= date('now', 'start of month')
      GROUP BY p.id ORDER BY count DESC LIMIT 1
    `).get();

    res.json({ topAgent, topCourier, topClient, topSeller });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getSalaryReport = (req, res) => {
  const report = db.prepare(`
    SELECT 
      u.id as userId,
      u.name as userName, 
      u.photo as userPhoto,
      u.role,
      sc.baseSalary,
      sc.commissionPercent as salesPercentage,
      COALESCE(SUM(o.totalPrice), 0) as salesAmount,
      (COALESCE(SUM(o.totalPrice), 0) * COALESCE(sc.commissionPercent, 0) / 100) as commissionEarned
    FROM users u
    LEFT JOIN user_salary_config sc ON u.id = sc.userId
    LEFT JOIN orders o ON u.id = o.agentId AND o.paymentStatus = 'paid' AND o.createdAt >= date('now', 'start of month')
    WHERE u.role IN ('agent', 'courier')
    GROUP BY u.id
  `).all();
  res.json(report);
};
