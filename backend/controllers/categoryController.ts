import db from "../database/database.js";

export const getAllCategories = async (req: any, res: any) => {
    try {
        const categories = db.prepare("SELECT * FROM categories").all();
        res.json(categories);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const createCategory = async (req: any, res: any) => {
    const { name } = req.body;
    try {
        const result = db.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
        res.json({ id: result.lastInsertRowid });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

export const deleteCategory = async (req: any, res: any) => {
    try {
        db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
