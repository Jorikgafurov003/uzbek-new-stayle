import db from "../database/database.js";
import { AIDispatcherService } from "../services/aiDispatcherService.js";

export const createOrder = async (req: any, res: any) => {
    const { items, totalPrice, address, lat, lng, paymentMethod } = req.body;
    const clientId = req.user.id;

    try {
        const result = db.prepare(`
            INSERT INTO orders (clientId, items, totalPrice, address, lat, lng, paymentMethod, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `).run(clientId, JSON.stringify(items), totalPrice, address, lat, lng, paymentMethod);

        const orderId = result.lastInsertRowid as number;

        // Trigger AI Dispatcher
        const courierId = await AIDispatcherService.autoAssign(orderId, lat, lng);

        res.json({
            success: true,
            orderId,
            assignedCourier: courierId || "Searching..."
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getOrderDetails = async (req: any, res: any) => {
    try {
        const order = db.prepare(`
            SELECT o.*, 
            u.name as clientName, u.phone as clientPhone,
            c.name as courierName, c.phone as courierPhone, c.lat as courierLat, c.lng as courierLng
            FROM orders o
            JOIN users u ON o.clientId = u.id
            LEFT JOIN users c ON o.courierId = c.id
            WHERE o.id = ?
        `).get(req.params.id);

        if (!order) return res.status(404).json({ error: "Order not found" });
        res.json(order);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getActiveOrders = async (req: any, res: any) => {
    const { role, id } = req.user;
    let query = "SELECT * FROM orders WHERE status NOT IN ('delivered', 'cancelled')";
    let params = [];

    if (role === 'client') {
        query += " AND clientId = ?";
        params.push(id);
    } else if (role === 'courier') {
        query += " AND courierId = ?";
        params.push(id);
    }

    try {
        const orders = db.prepare(query).all(...params);
        res.json(orders);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const updateOrderStatus = async (req: any, res: any) => {
    const { id } = req.params;
    const { status } = req.body;
    const { role, id: userId } = req.user;

    try {
        if (role === 'courier') {
            db.prepare("UPDATE orders SET status = ? WHERE id = ? AND courierId = ?").run(status, id, userId);
        } else if (role === 'admin') {
            db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
        } else {
            return res.status(403).json({ error: "Unauthorized" });
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
