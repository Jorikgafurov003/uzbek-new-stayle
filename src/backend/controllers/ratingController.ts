import db from '../models/db.js';

export const submitOrderRating = async (req: any, res: any) => {
    const { id } = req.params; // Order ID
    const { productRatings, courierRating, agentRating, courierComment, agentComment } = req.body;

    try {
        const order = await db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
        if (!order) return res.status(404).json({ error: "Order not found" });
        if (order.is_rated) return res.status(400).json({ error: "Order already rated" });

        await db.transaction(async () => {
            // 1. Rate Courier
            if (order.courierId && courierRating) {
                await db.prepare("INSERT INTO reviews (orderId, targetId, targetType, rating, comment) VALUES (?, ?, ?, ?, ?)").run(id, order.courierId, 'courier', courierRating, courierComment);
                await updateUserRating(order.courierId, courierRating);
            }

            // 2. Rate Agent
            if (order.agentId && agentRating) {
                await db.prepare("INSERT INTO reviews (orderId, targetId, targetType, rating, comment) VALUES (?, ?, ?, ?, ?)").run(id, order.agentId, 'agent', agentRating, agentComment);
                await updateUserRating(order.agentId, agentRating);
            }

            // 3. Rate Products
            if (productRatings && Array.isArray(productRatings)) {
                for (const { productId, rating, comment } of productRatings) {
                    await db.prepare("INSERT INTO reviews (orderId, targetId, targetType, rating, comment) VALUES (?, ?, ?, ?, ?)").run(id, productId, 'product', rating, comment);
                    await updateProductRating(productId, rating);
                }
            }

            // 4. Mark order as rated
            await db.prepare("UPDATE orders SET is_rated = 1 WHERE id = ?").run(id);
        });

        res.json({ success: true, message: "Ratings submitted successfully" });
    } catch (error) {
        console.error("Error submitting ratings:", error);
        res.status(500).json({ error: (error as any).message });
    }
};

async function updateUserRating(userId: any, newRating: any) {
    const user = await db.prepare("SELECT rating, rating_count FROM users WHERE id = ?").get(userId);
    if (user) {
        const newCount = (user.rating_count || 0) + 1;
        const newAvg = ((user.rating || 0) * (user.rating_count || 0) + newRating) / newCount;
        await db.prepare("UPDATE users SET rating = ?, rating_count = ? WHERE id = ?").run(newAvg, newCount, userId);
    }
}

async function updateProductRating(productId: any, newRating: any) {
    const product = await db.prepare("SELECT rating, rating_count FROM products WHERE id = ?").get(productId);
    if (product) {
        const newCount = (product.rating_count || 0) + 1;
        const newAvg = ((product.rating || 0) * (product.rating_count || 0) + newRating) / newCount;
        await db.prepare("UPDATE products SET rating = ?, rating_count = ? WHERE id = ?").run(newAvg, newCount, productId);
    }
}
