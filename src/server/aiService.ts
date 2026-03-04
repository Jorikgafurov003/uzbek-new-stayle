import { GoogleGenAI } from "@google/genai";
import Database from "better-sqlite3";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export class AIService {
  constructor(private db: Database.Database) {}

  async generateBusinessInsights() {
    try {
      const sales = this.db.prepare(`
        SELECT p.name, SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.price) as revenue
        FROM order_items oi
        JOIN products p ON oi.productId = p.id
        JOIN orders o ON oi.orderId = o.id
        WHERE o.createdAt >= date('now', '-7 days')
        GROUP BY p.id
        ORDER BY revenue DESC
      `).all();

      const agentPerformance = this.db.prepare(`
        SELECT u.name, COUNT(o.id) as order_count, SUM(o.totalPrice) as total_sales
        FROM orders o
        JOIN users u ON o.agentId = u.id
        WHERE o.createdAt >= date('now', '-7 days')
        GROUP BY u.id
      `).all();

      const courierEfficiency = this.db.prepare(`
        SELECT u.name, COUNT(o.id) as delivery_count
        FROM orders o
        JOIN users u ON o.courierId = u.id
        WHERE o.orderStatus = 'delivered' AND o.createdAt >= date('now', '-7 days')
        GROUP BY u.id
      `).all();

      const prompt = `
        Analyze the following business data for "Uzbechka Delivery" for the last 7 days and provide 3 key business insights and recommendations.
        
        Sales Data: ${JSON.stringify(sales)}
        Agent Performance: ${JSON.stringify(agentPerformance)}
        Courier Efficiency: ${JSON.stringify(courierEfficiency)}
        
        Return the response in JSON format:
        {
          "summary": "Brief overview of current business state",
          "recommendations": [
            {
              "text": "Specific action to take",
              "riskLevel": "low" | "medium" | "high"
            }
          ]
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || "{}");
      
      const insertInsight = this.db.prepare("INSERT INTO business_insights (summary, recommendation, risk_level) VALUES (?, ?, ?)");
      
      data.recommendations.forEach((rec: any) => {
        insertInsight.run(data.summary, rec.text, rec.riskLevel);
      });

      return data;
    } catch (error) {
      console.error("AI Insight generation failed:", error);
      return null;
    }
  }

  async generateProfitForecast() {
    try {
      const history = this.db.prepare(`
        SELECT date(createdAt) as date, SUM(totalPrice) as revenue, COUNT(id) as orders
        FROM orders
        WHERE createdAt >= date('now', '-90 days')
        GROUP BY date
        ORDER BY date ASC
      `).all();

      const prompt = `
        Based on the following 90-day sales history, forecast the next 30 days of revenue and order counts.
        
        History: ${JSON.stringify(history)}
        
        Return the response in JSON format as an array of objects:
        [
          {
            "date": "YYYY-MM-DD",
            "expectedOrders": number,
            "expectedRevenue": number,
            "confidence": number (0-1)
          }
        ]
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const forecast = JSON.parse(response.text || "[]");
      
      const deleteOld = this.db.prepare("DELETE FROM profit_forecast");
      deleteOld.run();
      
      const insertForecast = this.db.prepare("INSERT INTO profit_forecast (date, expected_orders, expected_revenue, confidence) VALUES (?, ?, ?, ?)");
      forecast.forEach((f: any) => {
        insertForecast.run(f.date, f.expectedOrders, f.expectedRevenue, f.confidence);
      });

      return forecast;
    } catch (error) {
      console.error("AI Forecast generation failed:", error);
      return [];
    }
  }

  async analyzeSecurity() {
    try {
      const recentOrders = this.db.prepare(`
        SELECT o.*, u.phone, u.role
        FROM orders o
        JOIN users u ON o.clientId = u.id
        WHERE o.createdAt >= datetime('now', '-24 hours')
      `).all();

      const prompt = `
        Analyze these recent orders for suspicious patterns (fraud, fake orders, abnormal behavior).
        
        Orders: ${JSON.stringify(recentOrders)}
        
        Return a list of security alerts in JSON format:
        [
          {
            "userId": number,
            "type": "string",
            "riskScore": number (0-100),
            "reason": "string"
          }
        ]
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const alerts = JSON.parse(response.text || "[]");
      
      const insertAlert = this.db.prepare("INSERT INTO security_alerts (user_id, type, risk_score) VALUES (?, ?, ?)");
      alerts.forEach((a: any) => {
        insertAlert.run(a.userId, a.type, a.riskScore);
      });

      return alerts;
    } catch (error) {
      console.error("Security analysis failed:", error);
      return [];
    }
  }
}
