import db from "../database/database.js";

export const getAllShops = async (req: any, res: any) => {
    try {
        const shops = db.prepare(`
            SELECT s.*, u.name as agentName 
            FROM shops s 
            LEFT JOIN users u ON s.agentId = u.id
        `).all();
        res.json(shops);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const createShop = async (req: any, res: any) => {
    const { name, address, lat, lng, agentId } = req.body;
    try {
        const result = db.prepare(`
            INSERT INTO shops (name, address, lat, lng, agentId) 
            VALUES (?, ?, ?, ?, ?)
        `).run(name, address || null, lat || null, lng || null, agentId || null);
        res.json({ id: result.lastInsertRowid });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

export const updateShop = async (req: any, res: any) => {
    const { id } = req.params;
    const { name, address, lat, lng, agentId } = req.body;
    try {
        db.prepare(`
            UPDATE shops 
            SET name = ?, address = ?, lat = ?, lng = ?, agentId = ?
            WHERE id = ?
        `).run(name, address || null, lat || null, lng || null, agentId || null, id);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

export const deleteShop = async (req: any, res: any) => {
    try {
        db.prepare("DELETE FROM shops WHERE id = ?").run(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
