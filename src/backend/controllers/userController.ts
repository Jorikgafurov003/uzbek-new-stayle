import db from '../models/db.js';
import { catchAsync } from '../utils/catchAsync.js';

export const getUsers = catchAsync(async (req: any, res: any) => {
  const { role, agentId } = req.query;
  let query = "SELECT * FROM users";
  let params: any[] = [];
  
  if (role || agentId) {
    query += " WHERE 1=1";
    if (role) {
      query += " AND role = ?";
      params.push(role);
    }
    if (agentId) {
      query += ' AND agent_id = ?';
      params.push(agentId);
    }
  }
  
  const users = await db.prepare(query).all(...params);
  res.json(users);
});

export const updateUser = catchAsync(async (req: any, res: any) => {
  const data = { ...req.body };

  if (data.password !== undefined && (!data.password || data.password.trim() === "")) {
    delete data.password;
  }

  const keys = Object.keys(data);
  if (keys.length === 0) {
    return res.json({ success: true, message: "No fields to update" });
  }

  const setString = keys.map((k) => `${k} = ?`).join(", ");
  const values = Object.values(data);
  
  await db.prepare(`UPDATE users SET ${setString} WHERE id = ?`).run(...values, req.params.id);

  res.json({ success: true });
});

export const deleteUser = catchAsync(async (req: any, res: any) => {
  const id = req.params.id;

  // Check for foreign key dependencies manually for better error messages
  const orderCount = ((await db.prepare("SELECT COUNT(*) as count FROM orders WHERE clientId = ? OR agentId = ? OR courierId = ?").get(id, id, id)) as any).count;
  if (orderCount > 0) {
    return res.status(400).json({ 
      error: "Запрещено удалять", 
      message: "Нельзя удалить пользователя, у которого есть связанные заказы. Попробуйте сначала удалить его заказы." 
    });
  }

  const debtCount = ((await db.prepare("SELECT COUNT(*) as count FROM debts WHERE clientId = ?").get(id)) as any).count;
  if (debtCount > 0) {
    return res.status(400).json({ 
      error: "Запрещено удалять", 
      message: "У этого клиента есть долги. Удаление невозможно." 
    });
  }

  const shopCount = ((await db.prepare("SELECT COUNT(*) as count FROM shops WHERE clientId = ? OR agentId = ?").get(id, id)) as any).count;
  if (shopCount > 0) {
      return res.status(400).json({
          error: "Запрещено удалять",
          message: "У пользователя есть связанные магазины."
      });
  }

  // NEW: Check if this agent has assigned clients
  const clientCount = ((await db.prepare("SELECT COUNT(*) as count FROM users WHERE agent_id = ?").get(id)) as any).count;
  if (clientCount > 0) {
    return res.status(400).json({
      error: "Запрещено удалять",
      message: "Нельзя удалить агента, за которым закреплены покупатели. Сначала переназначьте их другому агенту."
    });
  }

  await db.transaction(async () => {
    // Delete dependent records first to avoid foreign key constraints
    await db.prepare("DELETE FROM courier_locations WHERE courier_id = ?").run(id);
    await db.prepare("DELETE FROM employee_kpi WHERE user_id = ?").run(id);
    await db.prepare("DELETE FROM security_alerts WHERE user_id = ?").run(id);
    await db.prepare("DELETE FROM location_history WHERE userId = ?").run(id);
    await db.prepare("DELETE FROM user_salary_config WHERE userId = ?").run(id);
    await db.prepare("DELETE FROM agent_commission WHERE agent_id = ?").run(id);
    await db.prepare("DELETE FROM activity_logs WHERE userId = ?").run(id);
    await db.prepare("DELETE FROM salaries WHERE userId = ?").run(id);
    
    // Finally delete the user
    await db.prepare("DELETE FROM users WHERE id = ?").run(id);
  });
  
  res.json({ success: true });
});

export const getUserByFirebaseId = catchAsync(async (req: any, res: any) => {
  const user = await db.prepare("SELECT * FROM users WHERE firebase_uid = ?").get(req.params.uid);
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: "User not found" });
  }
});
