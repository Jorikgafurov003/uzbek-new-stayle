import Database from "better-sqlite3";

export class KPIService {
  constructor(private db: Database.Database) {}

  async calculateKPIs() {
    try {
      // Agents KPI
      const agents = this.db.prepare("SELECT * FROM users WHERE role = 'agent'").all();
      for (const agent of agents as any) {
        const stats = this.db.prepare(`
          SELECT COUNT(id) as total_orders, SUM(totalPrice) as total_sales
          FROM orders
          WHERE agentId = ? AND createdAt >= date('now', '-30 days')
        `).get(agent.id) as any;

        const clientGrowth = this.db.prepare(`
          SELECT COUNT(id) as count
          FROM users
          WHERE agentId = ? AND role = 'client' AND lastSeen >= date('now', '-30 days')
        `).get(agent.id) as any;

        const score = (stats.total_sales / 1000000) * 10 + (stats.total_orders * 2) + (clientGrowth.count * 5);
        const level = this.calculateLevel(score);

        this.db.prepare(`
          INSERT INTO employee_kpi (user_id, role, score, level, updated_at)
          VALUES (?, 'agent', ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id) DO UPDATE SET 
            score = excluded.score,
            level = excluded.level,
            updated_at = CURRENT_TIMESTAMP
        `).run(agent.id, score, level);
      }

      // Couriers KPI
      const couriers = this.db.prepare("SELECT * FROM users WHERE role = 'courier'").all();
      for (const courier of couriers as any) {
        const stats = this.db.prepare(`
          SELECT COUNT(id) as total_deliveries
          FROM orders
          WHERE courierId = ? AND orderStatus = 'delivered' AND createdAt >= date('now', '-30 days')
        `).get(courier.id) as any;

        const failed = this.db.prepare(`
          SELECT COUNT(id) as count
          FROM orders
          WHERE courierId = ? AND orderStatus = 'cancelled' AND createdAt >= date('now', '-30 days')
        `).get(courier.id) as any;

        const score = (stats.total_deliveries * 5) - (failed.count * 10);
        const level = this.calculateLevel(score);

        this.db.prepare(`
          INSERT INTO employee_kpi (user_id, role, score, level, updated_at)
          VALUES (?, 'courier', ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id) DO UPDATE SET 
            score = excluded.score,
            level = excluded.level,
            updated_at = CURRENT_TIMESTAMP
        `).run(courier.id, score, level);
      }

      // Ratings update
      this.updateRatings();

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

  private updateRatings() {
    const users = this.db.prepare("SELECT id, role FROM users WHERE role IN ('agent', 'courier', 'client')").all();
    for (const user of users as any) {
      const orders = this.db.prepare(`
        SELECT COUNT(id) as count
        FROM orders
        WHERE (clientId = ? OR agentId = ? OR courierId = ?) AND orderStatus = 'delivered'
      `).get(user.id, user.id, user.id) as any;

      const rating = Math.min(5, 3 + (orders.count / 10));

      this.db.prepare(`
        INSERT INTO ratings (user_id, role, rating, total_orders, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET 
          rating = excluded.rating,
          total_orders = excluded.total_orders,
          updated_at = CURRENT_TIMESTAMP
      `).run(user.id, user.role, rating, orders.count);
    }
  }
}
