const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3001;

// Store for active couriers/vehicles
// Structure: { id: { lat, lon, heading, speed, role, name, lastSeen } }
let activeEntities = {};

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

wss.on('connection', (ws) => {
    console.log('New connection established');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'update_location') {
                // Update or add the entity
                activeEntities[data.id] = {
                    id: data.id,
                    lat: data.lat,
                    lon: data.lon,
                    heading: data.heading || 0,
                    speed: data.speed || 0,
                    role: data.role || 'courier',
                    name: data.name || 'Unknown',
                    lastSeen: Date.now()
                };

                // Broadcast updates to all clients (dispatchers)
                broadcastEntities();
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    ws.on('close', () => {
        console.log('Connection closed');
    });
});

function broadcastEntities() {
    const payload = JSON.stringify({
        type: 'entities_update',
        entities: Object.values(activeEntities)
    });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

// Cleanup inactive entities (1 minute timeout)
setInterval(() => {
    const now = Date.now();
    let changed = false;
    Object.keys(activeEntities).forEach(id => {
        if (now - activeEntities[id].lastSeen > 60000) {
            delete activeEntities[id];
            changed = true;
        }
    });
    if (changed) broadcastEntities();
}, 10000);

server.listen(PORT, () => {
    console.log(`Navigation server running on http://localhost:${PORT}`);
});
