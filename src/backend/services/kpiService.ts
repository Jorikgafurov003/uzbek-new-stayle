import { SqliteDatabase } from "../models/sqlite-wrapper.js";

export class KPIService {
  constructor(private db: SqliteDatabase) {}

  async calculateKPIs() {
    try {
      // Agents KPI
      const agents = await this.db.prepare("SELECT * FROM users WHERE role = 'agent'").all();
      for (const agent of agents as any) {
        const stats = await this.db.prepare(`
          SELECT COUNT(id) as total_orders, SUM(totalPrice) as total_sales
          FROM orders
          WHERE agentId = $1 AND createdAt >= date('now', '-30 days')
        `).get(agent.id) as any;

        const clientGrowth = await this.db.prepare(`
          SELECT COUNT(id) as count
          FROM users
          WHERE agent_id = $1 AND role = 'client' AND lastSeen >= date('now', '-30 days')
        `).get(agent.id) as any;

        const score = (stats.total_sales / 1000000) * 10 + (stats.total_orders * 2) + (clientGrowth.count * 5);
        
        await this.db.prepare(`
          INSERT INTO employee_kpi (user_id, score, month)
          VALUES ($1, $2, strftime('%Y-%m', 'now'))
          ON CONFLICT(user_id) DO UPDATE SET 
            score = EXCLUDED.score,
            month = EXCLUDED.month
        `).run(agent.id, score);
      }

      // Couriers KPI
      const couriers = await this.db.prepare("SELECT * FROM users WHERE role = 'courier'").all();
      for (const courier of couriers as any) {
        const stats = await this.db.prepare(`
          SELECT COUNT(id) as total_deliveries
          FROM orders
          WHERE courierId = $1 AND orderStatus = 'delivered' AND createdAt >= date('now', '-30 days')
        `).get(courier.id) as any;

        const failed = await this.db.prepare(`
          SELECT COUNT(id) as count
          FROM orders
          WHERE courierId = $1 AND orderStatus = 'cancelled' AND createdAt >= date('now', '-30 days')
        `).get(courier.id) as any;

        const score = (stats.total_deliveries * 5) - (failed.count * 10);

        await this.db.prepare(`
          INSERT INTO employee_kpi (user_id, score, month)
          VALUES ($1, $2, strftime('%Y-%m', 'now'))
          ON CONFLICT(user_id) DO UPDATE SET 
            score = EXCLUDED.score,
            month = EXCLUDED.month
        `).run(courier.id, score);
      }

      // Ratings update
      await this.updateRatings();

      return true;
    } catch (error) {
      console.error("KPI calculation failed:", error);
      return false;
    }
  }

  private calculateLevel(score: number): string {
    if (score >= 1000) return 'platinum';
    if (score >= 500) return 'gold';
    if (score >= 200) return 'silver';
    return 'bronze';
  }

  private async updateRatings() {
    const users = await this.db.prepare("SELECT id, role FROM users WHERE role IN ('agent', 'courier', 'client')").all();
    for (const user of users as any) {
      const orders = await this.db.prepare(`
        SELECT COUNT(id) as count
        FROM orders
        WHERE (clientId = $1 OR agentId = $2 OR courierId = $3) AND orderStatus = 'delivered'
      `).get(user.id, user.id, user.id) as any;

      const rating = Math.min(5, 3 + (orders.count / 10));

      await this.db.prepare(`
        UPDATE users SET rating_count = $1, rating = $2 WHERE id = $3
      `).run(orders.count, rating, user.id);
    }
  }
}
