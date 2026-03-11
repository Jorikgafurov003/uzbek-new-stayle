import db from '../models/db.js';

export const getUsers = (req, res) => {
  const users = db.prepare("SELECT * FROM users").all();
  res.json(users);
};

export const updateUser = (req, res) => {
  const data = { ...req.body };

  // Если пароль пустой или состоит только из пробелов, удаляем его из объекта обновлений,
  // чтобы старый пароль в БД не перезаписался пустой строкой.
  if (data.password !== undefined && (!data.password || data.password.trim() === "")) {
    delete data.password;
  }

  const keys = Object.keys(data);
  if (keys.length === 0) {
    return res.json({ success: true, message: "No fields to update" });
  }

  const updates = keys.map(k => `${k} = ?`).join(", ");
  db.prepare(`UPDATE users SET ${updates} WHERE id = ?`).run(...Object.values(data), req.params.id);

  res.json({ success: true });
};

export const deleteUser = (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ success: true });
};
