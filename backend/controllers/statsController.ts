import db from "../database/database.js";

export const getDashboardStats = async (req: any, res: any) => {
    try {
        const totalRevenue = db.prepare("SELECT SUM(totalPrice) as total FROM orders WHERE status = 'delivered'").get().total || 0;
        const totalOrders = db.prepare("SELECT COUNT(*) as count FROM orders").get().count || 0;
        const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get().count || 0;
        const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products").get().count || 0;

        const salesByCategory = db.prepare(`
            SELECT c.name, SUM(p.price) as value
            FROM orders o
            JOIN users u ON o.clientId = u.id
            CROSS JOIN json_each(o.items) as item
            JOIN products p ON json_extract(item.value, '$.id') = p.id
            JOIN categories c ON p.categoryId = c.id
            WHERE o.status = 'delivered'
            GROUP BY c.id
        `).all();

        res.json({
            revenue: totalRevenue,
            orders: totalOrders,
            users: totalUsers,
            products: totalProducts,
            salesByCategory
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getTopStats = async (req: any, res: any) => {
    try {
        const topAgent = db.prepare(`
            SELECT u.id, u.name, u.photo, COUNT(o.id) as count
            FROM orders o
            JOIN users u ON o.agentId = u.id
            WHERE o.createdAt >= date('now', 'start of month')
            GROUP BY u.id ORDER BY count DESC LIMIT 1
        `).get();

        const topCourier = db.prepare(`
            SELECT u.id, u.name, u.photo, COUNT(o.id) as count
            FROM orders o
            JOIN users u ON o.courierId = u.id
            WHERE o.status = 'delivered' AND o.createdAt >= date('now', 'start of month')
            GROUP BY u.id ORDER BY count DESC LIMIT 1
        `).get();

        res.json({ topAgent, topCourier });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
