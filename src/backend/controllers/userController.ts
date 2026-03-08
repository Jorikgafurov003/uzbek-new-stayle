import db from '../models/db.js';

export const getUsers = (req, res) => {
  const users = db.prepare("SELECT * FROM users").all();
  res.json(users);
};

export const updateUser = (req, res) => {
  const updates = Object.entries(req.body).map(([k, v]) => `${k} = ?`).join(", ");
  db.prepare(`UPDATE users SET ${updates} WHERE id = ?`).run(...Object.values(req.body), req.params.id);
  res.json({ success: true });
};

export const deleteUser = (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ success: true });
};
