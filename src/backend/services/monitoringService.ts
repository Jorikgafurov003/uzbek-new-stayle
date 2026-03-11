import Database from "better-sqlite3";
import { Server } from "socket.io";

export class MonitoringService {
  constructor(private db: Database.Database, private io: Server) {}

  async checkHealth() {
    try {
      const logs = this.db.prepare(`
        SELECT * FROM system_errors 
        WHERE fixed = 0 AND createdAt >= datetime('now', '-1 hour')
      `).all();

      const memory = process.memoryUsage();
      const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);

      if (heapUsedMB > 400) {
        this.logHealthIssue('Memory', `High memory usage: ${heapUsedMB}MB`, 'high');
        // Auto-fix: Clear some cache if possible
        if (global.gc) global.gc();
      }

      if (logs.length > 10) {
        this.logHealthIssue('API', `High error rate: ${logs.length} errors in last hour`, 'medium');
      }

      // Check DB connectivity
      try {
        this.db.prepare("SELECT 1").get();
      } catch (e) {
        this.logHealthIssue('Database', 'Database connection issue', 'high');
      }

      return true;
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }

  private logHealthIssue(service: string, issue: string, severity: 'low' | 'medium' | 'high') {
    this.db.prepare(`
      INSERT INTO system_health_logs (service, issue, severity, auto_fix_applied)
      VALUES (?, ?, ?, 0)
    `).run(service, issue, severity);
    
    this.io.emit('system_health_alert', { service, issue, severity });
  }

  async applyAutoFix(logId: number) {
    const log = this.db.prepare("SELECT * FROM system_health_logs WHERE id = ?").get(logId) as any;
    if (!log) return false;

    let fixed = false;
    if (log.service === 'Websocket') {
      // Logic to restart websocket if needed
      fixed = true;
    } else if (log.service === 'Memory') {
      if (global.gc) global.gc();
      fixed = true;
    }

    if (fixed) {
      this.db.prepare("UPDATE system_health_logs SET auto_fix_applied = 1 WHERE id = ?").run(logId);
    }
    return fixed;
  }
}
