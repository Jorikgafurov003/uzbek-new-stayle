import db from "../database/database.js";

interface CourierScore {
    userId: number;
    score: number;
    distance: number;
    load: number;
    rating: number;
}

export class AIDispatcherService {
    static async autoAssign(orderId: number, orderLat: number, orderLng: number) {
        console.log(`AI Dispatcher: Processing auto-assignment for order ${orderId}`);

        // Find all online and free (not busy) couriers
        const couriers = db.prepare(`
            SELECT id, name, lat, lng, rating,
            (SELECT COUNT(*) FROM orders WHERE courierId = users.id AND status IN ('pending', 'accepted', 'on_way')) as currentLoad
            FROM users 
            WHERE role = 'courier' AND status = 'active' AND isOnline = 1
        `).all() as any[];

        if (couriers.length === 0) {
            console.log("No available couriers for order", orderId);
            return null;
        }

        const scoredCouriers: CourierScore[] = couriers.map(c => {
            const distance = this.calculateDistance(orderLat, orderLng, c.lat, c.lng);
            const load = c.currentLoad;
            const rating = c.rating || 5.0;

            // SCORING LOGIC (Lower is better?)
            // Weights:
            // Distance (40%): Weight = 0.4
            // Load (30%): Weight = 0.3
            // Rating (30%): Weight = -0.3 (higher rating is better, so negate it for "lower is better" score)

            const score = (distance * 0.4) + (load * 2.0) - (rating * 0.5);

            return {
                userId: c.id,
                score,
                distance,
                load,
                rating
            };
        });

        // Find the courier with the BEST (lowest) score
        const winner = scoredCouriers.sort((a, b) => a.score - b.score)[0];

        db.prepare("UPDATE orders SET courierId = ?, status = 'assigned' WHERE id = ?").run(winner.userId, orderId);

        console.log(`AI Dispatcher: Order ${orderId} assigned to courier ${winner.userId} with score ${winner.score.toFixed(2)}`);

        return winner.userId;
    }

    private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        // Simplified Haversine formula (approximate)
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
