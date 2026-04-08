import db from "../database/database.js";

export const getAllProducts = async (req: any, res: any) => {
    try {
        const products = db.prepare(`
            SELECT p.*, c.name as categoryName
            FROM products p
            LEFT JOIN categories c ON p.categoryId = c.id
        `).all();
        res.json(products);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const createProduct = async (req: any, res: any) => {
    const { name, price, discountPrice, categoryId, image, description, stock, agentId } = req.body;
    try {
        const result = db.prepare(`
            INSERT INTO products (name, price, discountPrice, categoryId, image, description, stock, agent_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(name, price, discountPrice || null, categoryId || null, image || null, description || null, stock || 0, agentId || null);
        res.json({ id: result.lastInsertRowid });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

export const updateProduct = async (req: any, res: any) => {
    const { id } = req.params;
    const { name, price, discountPrice, categoryId, image, description, stock } = req.body;
    try {
        db.prepare(`
            UPDATE products 
            SET name = ?, price = ?, discountPrice = ?, categoryId = ?, image = ?, description = ?, stock = ?
            WHERE id = ?
        `).run(name, price, discountPrice || null, categoryId || null, image || null, description || null, stock || 0, id);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

export const deleteProduct = async (req: any, res: any) => {
    try {
        db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
