import { GoogleGenAI } from "@google/genai";
import { PgDatabase } from "../models/pg-wrapper.js";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export class AIService {
  constructor(private db: PgDatabase) { }

  async generateBusinessInsights() {
    if (!ai) return null;
    try {
      const sales = await this.db.prepare(`
        SELECT p.name, SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.price) as revenue
        FROM order_items oi
        JOIN products p ON oi.productId = p.id
        JOIN orders o ON oi.orderId = o.id
        WHERE o."createdAt" >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY p.id
        ORDER BY revenue DESC
      `).all();

      const agentPerformance = await this.db.prepare(`
        SELECT u.name, COUNT(o.id) as order_count, SUM(o."totalPrice") as total_sales
        FROM orders o
        JOIN users u ON o."agentId" = u.id
        WHERE o."createdAt" >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY u.id
      `).all();

      const courierEfficiency = await this.db.prepare(`
        SELECT u.name, COUNT(o.id) as delivery_count
        FROM orders o
        JOIN users u ON o."courierId" = u.id
        WHERE o."orderStatus" = 'delivered' AND o."createdAt" >= CURRENT_DATE - INTERVAL '7 days'
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

      for (const rec of data.recommendations) {
          try {
              await this.db.prepare("INSERT INTO business_insights (title, content, type) VALUES (?, ?, ?)").run(data.summary, rec.text, rec.riskLevel);
          } catch(err) {
              console.error(err);
          }
      }

      return data;
    } catch (error) {
      console.error("AI Insight generation failed:", error);
      return null;
    }
  }

  async generateProfitForecast() {
    if (!ai) return [];
    try {
      const history = await this.db.prepare(`
        SELECT DATE("createdAt") as date, SUM("totalPrice") as revenue, COUNT(id) as orders
        FROM orders
        WHERE "createdAt" >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY DATE("createdAt")
        ORDER BY DATE("createdAt") ASC
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

      await this.db.prepare("DELETE FROM profit_forecast").run();

      for (const f of forecast) {
          try {
              await this.db.prepare("INSERT INTO profit_forecast (date, amount) VALUES (?, ?)").run(f.date, f.expectedRevenue);
          } catch(err) {
              console.error(err);
          }
      }

      return forecast;
    } catch (error) {
      console.error("AI Forecast generation failed:", error);
      return [];
    }
  }

  async analyzeSecurity() {
    if (!ai) return [];
    try {
      const recentOrders = await this.db.prepare(`
        SELECT o.*, u.phone, u.role
        FROM orders o
        JOIN users u ON o."clientId" = u.id
        WHERE o."createdAt" >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
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

      for (const a of alerts) {
          try {
              await this.db.prepare("INSERT INTO security_alerts (user_id, type, message, severity) VALUES (?, ?, ?, ?)").run(a.userId, a.type, a.reason, a.riskLevel > 50 ? 'high' : 'medium');
          } catch(err) {
              console.error(err);
          }
      }

      return alerts;
    } catch (error) {
      console.error("Security analysis failed:", error);
      return [];
    }
  }
}
