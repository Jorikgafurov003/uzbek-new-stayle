import { io, Socket } from "socket.io-client";

const SOCKET_URL = ""; // Same origin

class SocketService {
    private socket: Socket | null = null;

    connect() {
        if (!this.socket) {
            this.socket = io(SOCKET_URL);
            this.socket.on("connect", () => {
                console.log("Connected to Real-time Super Delivery Server");
            });
        }
        return this.socket;
    }

    join(userId: number, role: string) {
        if (!this.socket) this.connect();
        this.socket?.emit("join", { userId, role });
    }

    updateLocation(userId: number, lat: number, lng: number) {
        this.socket?.emit("updateLocation", { userId, lat, lng });
    }

    onLocationUpdated(callback: (data: any) => void) {
        this.socket?.on("locationUpdated", callback);
    }

    onOrderUpdated(callback: (data: any) => void) {
        this.socket?.on("orderUpdated", callback);
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }
}

export const socketService = new SocketService();
