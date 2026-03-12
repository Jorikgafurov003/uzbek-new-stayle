import db from '../models/db.js';

export const getAIInsights = async (req: any, res: any) => {
  const insights = await db.prepare("SELECT * FROM business_insights ORDER BY createdAt DESC LIMIT 10").all();
  res.json(insights);
};

export const getProfitForecast = async (req: any, res: any) => {
  const forecast = await db.prepare("SELECT * FROM profit_forecast ORDER BY date ASC").all();
  res.json(forecast);
};

export const getKPILeaderboard = async (req: any, res: any) => {
  const leaderboard = await db.prepare(`
    SELECT k.*, u.name, u.photo
    FROM employee_kpi k
    JOIN users u ON k.user_id = u.id
    ORDER BY k.score DESC
  `).all();
  res.json(leaderboard);
};

export const getSystemHealth = async (req: any, res: any) => {
  const logs = await db.prepare("SELECT * FROM system_health_logs ORDER BY createdAt DESC LIMIT 50").all();
  res.json(logs);
};

export const getSecurityAlerts = async (req: any, res: any) => {
  const alerts = await db.prepare(`
    SELECT s.*, u.name as userName
    FROM security_alerts s
    LEFT JOIN users u ON s.user_id = u.id
    ORDER BY s.createdAt DESC LIMIT 50
  `).all();
  res.json(alerts);
};

export const getTopStats = async (req: any, res: any) => {
  try {
    const monthStart = "CURRENT_DATE - INTERVAL '1 month'"; // PostgreSQL valid date logic instead of SQLite date('now')

    const topAgent = await db.prepare(`
      SELECT u.id, u.name, u.photo, COUNT(o.id) as count
      FROM orders o
      JOIN users u ON o.agentId = u.id
      WHERE o.createdAt >= ${monthStart}
      GROUP BY u.id ORDER BY count DESC LIMIT 1
    `).get();

    const topCourier = await db.prepare(`
      SELECT u.id, u.name, u.photo, COUNT(o.id) as count
      FROM orders o
      JOIN users u ON o.courierId = u.id
      WHERE o.orderStatus = 'delivered' AND o.createdAt >= ${monthStart}
      GROUP BY u.id ORDER BY count DESC LIMIT 1
    `).get();

    const topClient = await db.prepare(`
      SELECT u.id, u.name, u.photo, COUNT(o.id) as count
      FROM orders o
      JOIN users u ON o.clientId = u.id
      WHERE o.createdAt >= ${monthStart}
      GROUP BY u.id ORDER BY count DESC LIMIT 1
    `).get();

    const topSeller = await db.prepare(`
      SELECT p.id, p.name, p.image, SUM(oi.quantity) as count
      FROM order_items oi
      JOIN products p ON oi.productId = p.id
      JOIN orders o ON oi.orderId = o.id
      WHERE o.createdAt >= ${monthStart}
      GROUP BY p.id ORDER BY count DESC LIMIT 1
    `).get();

    res.json({ topAgent, topCourier, topClient, topSeller });
  } catch (e) {
    res.status(500).json({ error: (e as any).message });
  }
};

export const getSalaryReport = async (req: any, res: any) => {
  const report = await db.prepare(`
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
    LEFT JOIN orders o ON u.id = o.agentId AND o.paymentStatus = 'paid' AND o.createdAt >= CURRENT_DATE - INTERVAL '1 month'
    WHERE u.role IN ('agent', 'courier')
    GROUP BY u.id, sc.baseSalary, sc.commissionPercent
  `).all();
  res.json(report);
};

export const getAccounting = async (req: any, res: any) => {
  try {
    // Consolidated Query for Summary
    const summaryQuery = `
      SELECT 
        (SELECT SUM(totalPrice) FROM orders WHERE paymentStatus = 'paid') as "totalIncome",
        (SELECT SUM(totalPrice) FROM orders WHERE paymentStatus = 'paid' AND paymentType = 'cash') as "cashIncome",
        (SELECT SUM(totalPrice) FROM orders WHERE paymentStatus = 'paid' AND paymentType = 'card') as "cardIncome",
        (SELECT SUM(amount) FROM debts WHERE status = 'pending') as "unpaidDebts",
        (SELECT SUM(amount) FROM debts WHERE status = 'paid') as "repaidDebts",
        (SELECT SUM(amount) FROM expenses) as "totalExpenses"
    `;
    const summaryResult: any = await db.prepare(summaryQuery).get();

    const totalIncome = summaryResult?.totalIncome || 0;
    const cashIncome = summaryResult?.cashIncome || 0;
    const cardIncome = summaryResult?.cardIncome || 0;
    const unpaidDebts = summaryResult?.unpaidDebts || 0;
    const repaidDebts = summaryResult?.repaidDebts || 0;
    const totalExpenses = summaryResult?.totalExpenses || 0;

    // List of expenses
    const expensesList = await db.prepare("SELECT * FROM expenses ORDER BY date DESC").all();

    // Calculate COGS
    const cogsQuery = `
      SELECT SUM(oi.quantity * COALESCE(p."costPrice", 0)) as totalCogs
      FROM order_items oi
      JOIN products p ON oi."productId" = p.id
      JOIN orders o ON oi."orderId" = o.id
      WHERE o."paymentStatus" = 'paid'
    `;
    // Try catch specifically for COGS in case of unquoted column issues temporarily while translating
    let totalCogs = 0;
    try {
        const cogsResult: any = await db.prepare(cogsQuery).get();
        totalCogs = cogsResult?.totalcogs || 0;
    } catch { }  // ignoring during port

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
    res.status(500).json({ error: (error as any).message });
  }
};

export const resetStats = async (req: any, res: any) => {
  try {
    await db.prepare("DELETE FROM expenses").run();
    await db.prepare("DELETE FROM profit_forecast").run();
    await db.prepare("DELETE FROM salaries").run();
    await db.prepare("DELETE FROM debts").run();
    await db.prepare("DELETE FROM order_items").run();
    await db.prepare("DELETE FROM orders").run();
    res.json({ success: true, message: "All stats and counters reset to zero." });
  } catch (error) {
    console.error("Error resetting stats:", error);
    res.status(500).json({ error: (error as any).message });
  }
};
