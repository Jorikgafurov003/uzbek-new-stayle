import db from "../database/database.js";

export const getAllWarehouses = async (req: any, res: any) => {
    try {
        const warehouses = db.prepare("SELECT * FROM warehouses").all();
        res.json(warehouses);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const createWarehouse = async (req: any, res: any) => {
    const { name, address, lat, lng } = req.body;
    try {
        const result = db.prepare(`
            INSERT INTO warehouses (name, address, lat, lng) 
            VALUES (?, ?, ?, ?)
        `).run(name, address || null, lat || null, lng || null);
        res.json({ id: result.lastInsertRowid });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

export const getInventory = async (req: any, res: any) => {
    try {
        const inventory = db.prepare(`
            SELECT wi.*, w.name as warehouseName, p.name as productName
            FROM warehouse_inventory wi
            JOIN warehouses w ON wi.warehouseId = w.id
            JOIN products p ON wi.productId = p.id
        `).all();
        res.json(inventory);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const updateInventory = async (req: any, res: any) => {
    const { warehouseId, productId, quantity } = req.body;
    try {
        db.prepare(`
            INSERT INTO warehouse_inventory (warehouseId, productId, quantity)
            VALUES (?, ?, ?)
            ON CONFLICT(warehouseId, productId) DO UPDATE SET quantity = excluded.quantity
        `).run(warehouseId, productId, quantity);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};
