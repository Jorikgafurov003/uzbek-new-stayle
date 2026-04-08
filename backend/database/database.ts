import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isElectron = process.env.IS_ELECTRON === 'true';
const dbPath = isElectron
    ? path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share"), 'uzbechka.db')
    : "uzbechka.db";

const db = new Database(dbPath);

export const initDB = () => {
    console.log("Initializing database at:", dbPath);
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'client',
            carType TEXT,
            carPhoto TEXT,
            photo TEXT,
            lat REAL,
            lng REAL,
            lastSeen DATETIME,
            agent_id INTEGER,
            status TEXT DEFAULT 'active',
            created_by INTEGER,
            firebaseUID TEXT UNIQUE,
            rating REAL DEFAULT 5.0,
            isOnline BOOLEAN DEFAULT 0,
            FOREIGN KEY (agent_id) REFERENCES users(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            discountPrice REAL,
            categoryId INTEGER,
            image TEXT,
            videoUrl TEXT,
            description TEXT,
            stock INTEGER DEFAULT 0,
            agent_id INTEGER,
            FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
            FOREIGN KEY (agent_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS banners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            image TEXT NOT NULL,
            link TEXT,
            active BOOLEAN DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clientId INTEGER,
            agentId INTEGER,
            courierId INTEGER,
            items TEXT NOT NULL,
            totalPrice REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            address TEXT,
            lat REAL,
            lng REAL,
            paymentMethod TEXT,
            paymentStatus TEXT DEFAULT 'pending',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (clientId) REFERENCES users(id),
            FOREIGN KEY (agentId) REFERENCES users(id),
            FOREIGN KEY (courierId) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS warehouses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT,
            lat REAL,
            lng REAL
        );

        CREATE TABLE IF NOT EXISTS warehouse_inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            warehouseId INTEGER,
            productId INTEGER,
            quantity INTEGER DEFAULT 0,
            FOREIGN KEY (warehouseId) REFERENCES warehouses(id),
            FOREIGN KEY (productId) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS shop_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agentId INTEGER,
            shopId INTEGER,
            warehouseId INTEGER,
            totalPrice REAL,
            status TEXT DEFAULT 'pending',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agentId) REFERENCES users(id),
            FOREIGN KEY (shopId) REFERENCES shops(id),
            FOREIGN KEY (warehouseId) REFERENCES warehouses(id)
        );

        CREATE TABLE IF NOT EXISTS shops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT,
            lat REAL,
            lng REAL,
            agentId INTEGER,
            FOREIGN KEY (agentId) REFERENCES users(id)
        );
    `);
    console.log("Database initialized successfully");
};

export default db;
