import db from '../models/db.js';

export const submitOrderRating = (req, res) => {
    const { id } = req.params; // Order ID
    const { productRatings, courierRating, agentRating, courierComment, agentComment } = req.body;

    try {
        const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
        if (!order) return res.status(404).json({ error: "Order not found" });
        if (order.is_rated) return res.status(400).json({ error: "Order already rated" });

        const insertReview = db.prepare(`
      INSERT INTO reviews (orderId, targetId, targetType, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `);

        db.transaction(() => {
            // 1. Rate Courier
            if (order.courierId && courierRating) {
                insertReview.run(id, order.courierId, 'courier', courierRating, courierComment);
                updateUserRating(order.courierId, courierRating);
            }

            // 2. Rate Agent
            if (order.agentId && agentRating) {
                insertReview.run(id, order.agentId, 'agent', agentRating, agentComment);
                updateUserRating(order.agentId, agentRating);
            }

            // 3. Rate Products
            if (productRatings && Array.isArray(productRatings)) {
                productRatings.forEach(({ productId, rating, comment }) => {
                    insertReview.run(id, productId, 'product', rating, comment);
                    updateProductRating(productId, rating);
                });
            }

            // 4. Mark order as rated
            db.prepare("UPDATE orders SET is_rated = 1 WHERE id = ?").run(id);
        })();

        res.json({ success: true, message: "Ratings submitted successfully" });
    } catch (error) {
        console.error("Error submitting ratings:", error);
        res.status(500).json({ error: error.message });
    }
};

function updateUserRating(userId, newRating) {
    const user = db.prepare("SELECT rating, rating_count FROM users WHERE id = ?").get(userId);
    if (user) {
        const newCount = (user.rating_count || 0) + 1;
        const newAvg = ((user.rating || 0) * (user.rating_count || 0) + newRating) / newCount;
        db.prepare("UPDATE users SET rating = ?, rating_count = ? WHERE id = ?").run(newAvg, newCount, userId);
    }
}

function updateProductRating(productId, newRating) {
    const product = db.prepare("SELECT rating, rating_count FROM products WHERE id = ?").get(productId);
    if (product) {
        const newCount = (product.rating_count || 0) + 1;
        const newAvg = ((product.rating || 0) * (product.rating_count || 0) + newRating) / newCount;
        db.prepare("UPDATE products SET rating = ?, rating_count = ? WHERE id = ?").run(newAvg, newCount, productId);
    }
}
