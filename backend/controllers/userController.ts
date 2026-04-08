import db from "../database/database.js";

export const getAllUsers = async (req: any, res: any) => {
    try {
        const users = db.prepare(`
            SELECT u.*, creator.name as creatorName
            FROM users u
            LEFT JOIN users creator ON u.created_by = creator.id
        `).all();
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const updateUser = async (req: any, res: any) => {
    const { id } = req.params;
    const { name, phone, password, role, status, carType, carPhoto, photo } = req.body;

    try {
        let query = "UPDATE users SET name = ?, phone = ?, role = ?, status = ?, carType = ?, carPhoto = ?, photo = ?";
        let params = [name, phone, role, status, carType || null, carPhoto || null, photo || null];

        if (password && password !== "Оставьте пустым для сохранения") {
            query += ", password = ?";
            params.push(password);
        }

        query += " WHERE id = ?";
        params.push(id);

        db.prepare(query).run(...params);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

export const deleteUser = async (req: any, res: any) => {
    try {
        db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
