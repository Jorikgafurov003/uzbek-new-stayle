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
    const monthStart = "date('now', 'start of month')";

    const topAgent = db.prepare(`
      SELECT u.id, u.name, u.photo, COUNT(o.id) as count
      FROM orders o
      JOIN users u ON o.agentId = u.id
      WHERE o.createdAt >= ${monthStart}
      GROUP BY u.id ORDER BY count DESC LIMIT 1
    `).get();

    const topCourier = db.prepare(`
      SELECT u.id, u.name, u.photo, COUNT(o.id) as count
      FROM orders o
      JOIN users u ON o.courierId = u.id
      WHERE o.orderStatus = 'delivered' AND o.createdAt >= ${monthStart}
      GROUP BY u.id ORDER BY count DESC LIMIT 1
    `).get();

    const topClient = db.prepare(`
      SELECT u.id, u.name, u.photo, COUNT(o.id) as count
      FROM orders o
      JOIN users u ON o.clientId = u.id
      WHERE o.createdAt >= ${monthStart}
      GROUP BY u.id ORDER BY count DESC LIMIT 1
    `).get();

    const topSeller = db.prepare(`
      SELECT p.id, p.name, p.image, SUM(oi.quantity) as count
      FROM order_items oi
      JOIN products p ON oi.productId = p.id
      JOIN orders o ON oi.orderId = o.id
      WHERE o.createdAt >= ${monthStart}
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

export const getAccounting = (req, res) => {
  try {
    // Consolidated Query for Summary
    const summaryQuery = `
      SELECT 
        (SELECT SUM(totalPrice) FROM orders WHERE paymentStatus = 'paid') as totalIncome,
        (SELECT SUM(totalPrice) FROM orders WHERE paymentStatus = 'paid' AND paymentType = 'cash') as cashIncome,
        (SELECT SUM(totalPrice) FROM orders WHERE paymentStatus = 'paid' AND paymentType = 'card') as cardIncome,
        (SELECT SUM(amount) FROM debts WHERE status = 'pending') as unpaidDebts,
        (SELECT SUM(amount) FROM debts WHERE status = 'paid') as repaidDebts,
        (SELECT SUM(amount) FROM expenses) as totalExpenses
    `;
    const summaryResult: any = db.prepare(summaryQuery).get();

    const totalIncome = summaryResult?.totalIncome || 0;
    const cashIncome = summaryResult?.cashIncome || 0;
    const cardIncome = summaryResult?.cardIncome || 0;
    const unpaidDebts = summaryResult?.unpaidDebts || 0;
    const repaidDebts = summaryResult?.repaidDebts || 0;
    const totalExpenses = summaryResult?.totalExpenses || 0;

    // List of expenses
    const expensesList = db.prepare("SELECT * FROM expenses ORDER BY date DESC").all();

    // Calculate COGS
    const cogsQuery = `
      SELECT SUM(oi.quantity * COALESCE(p.costPrice, 0)) as totalCogs
      FROM order_items oi
      JOIN products p ON oi.productId = p.id
      JOIN orders o ON oi.orderId = o.id
      WHERE o.paymentStatus = 'paid'
    `;
    const cogsResult: any = db.prepare(cogsQuery).get();
    const totalCogs = cogsResult?.totalCogs || 0;

    // Actual Revenue (Direct + Repaid)
    const actualRevenue = totalIncome + repaidDebts;
    const netProfit = actualRevenue - totalExpenses - totalCogs;

    res.json({
      summary: {
        totalIncome,
        cashIncome,
        cardIncome,
        unpaidDebts,
        repaidDebts,
        actualRevenue,
        totalExpenses,
        totalCogs,
        netProfit
      },
      expenses: expensesList
    });
  } catch (error) {
    console.error("Error in getAccounting:", error);
    res.status(500).json({ error: error.message });
  }
};

export const resetStats = (req, res) => {
  try {
    db.prepare("DELETE FROM expenses").run();
    db.prepare("DELETE FROM profit_forecast").run();
    db.prepare("DELETE FROM salaries").run();
    db.prepare("DELETE FROM debts").run();
    db.prepare("DELETE FROM order_items").run();
    db.prepare("DELETE FROM orders").run();
    res.json({ success: true, message: "All stats and counters reset to zero." });
  } catch (error) {
    console.error("Error resetting stats:", error);
    res.status(500).json({ error: error.message });
  }
};
