import { Server } from "socket.io";
import db from "../database/database.js";

export class SocketHandler {
    private io: Server;

    constructor(io: Server) {
        this.io = io;
        this.init();
    }

    private init() {
        this.io.on("connection", (socket) => {
            console.log("Client connected:", socket.id);

            // Join a role-specific room (optional but good for targeted broadcasts)
            socket.on("join", (data: { userId: number; role: string }) => {
                socket.join(`user:${data.userId}`);
                socket.join(`role:${data.role}`);
                console.log(`User ${data.userId} joined as ${data.role}`);
            });

            // Handle GPS updates from Couriers
            socket.on("updateLocation", (data: { userId: number; lat: number; lng: number }) => {
                try {
                    db.prepare("UPDATE users SET lat = ?, lng = ?, lastSeen = CURRENT_TIMESTAMP WHERE id = ?").run(
                        data.lat, data.lng, data.userId
                    );

                    // Broadcast updated location to Admins and Agents
                    this.io.to("role:admin").to("role:agent").emit("locationUpdated", data);

                    // Also broadcast to Clients who have active orders with this courier
                    // (Implementation detail: find clients with active orders for this courier)
                    const clients = db.prepare("SELECT clientId FROM orders WHERE courierId = ? AND status IN ('on_way', 'delivering')").all(data.userId) as any[];
                    clients.forEach(c => {
                        this.io.to(`user:${c.clientId}`).emit("courierLocation", data);
                    });

                } catch (e) {
                    console.error("Error updating location:", e);
                }
            });

            // Handle Order Status Updates
            socket.on("updateOrderStatus", (data: { orderId: number; status: string; userId: number }) => {
                try {
                    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(data.status, data.orderId);

                    // Notify involved parties
                    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(data.orderId) as any;
                    if (order) {
                        this.io.to(`user:${order.clientId}`).emit("orderUpdated", { orderId: data.orderId, status: data.status });
                        this.io.to("role:admin").to("role:agent").emit("orderUpdated", { orderId: data.orderId, status: data.status });
                    }
                } catch (e) {
                    console.error("Error updating order status:", e);
                }
            });

            socket.on("disconnect", () => {
                console.log("Client disconnected:", socket.id);
            });
        });
    }

    // Utility to emit events from outside the class if needed
    public emitToUser(userId: number, event: string, data: any) {
        this.io.to(`user:${userId}`).emit(event, data);
    }

    public emitToRole(role: string, event: string, data: any) {
        this.io.to(`role:${role}`).emit(event, data);
    }
}
