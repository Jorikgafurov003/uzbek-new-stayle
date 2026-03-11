import Database from "better-sqlite3";
const db = new Database("c:/google uzb/uzbechka.db");
const users = db.prepare("SELECT id, name, phone, role FROM users").all();
const categories = db.prepare("SELECT * FROM categories").all();
const shops = db.prepare("SELECT * FROM shops").all();
console.log("Users:", JSON.stringify(users, null, 2));
console.log("Categories:", JSON.stringify(categories, null, 2));
console.log("Shops:", JSON.stringify(shops, null, 2));


