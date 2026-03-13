import db from '../models/db.js';

export const getUsers = async (req: any, res: any) => {
  const users = await db.prepare("SELECT * FROM users").all();
  res.json(users);
};

export const updateUser = async (req: any, res: any) => {
  const data = { ...req.body };

  if (data.password !== undefined && (!data.password || data.password.trim() === "")) {
    delete data.password;
  }

  const keys = Object.keys(data);
  if (keys.length === 0) {
    return res.json({ success: true, message: "No fields to update" });
  }

  const setString = keys.map((k, i) => `"${k}" = ?`).join(", ");
  const values = Object.values(data);
  
  await db.prepare(`UPDATE users SET ${setString} WHERE id = ?`).run(...values, req.params.id);

  res.json({ success: true });
};

export const deleteUser = async (req: any, res: any) => {
  await db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ success: true });
};

export const getUserByFirebaseId = async (req: any, res: any) => {
  const user = await db.prepare("SELECT * FROM users WHERE firebase_uid = ?").get(req.params.uid);
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: "User not found" });
  }
};
