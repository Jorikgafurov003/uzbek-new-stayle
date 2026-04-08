import Database from "better-sqlite3";
const db = new Database("uzbechka.db");
const users = db.prepare("SELECT id, name, phone, role FROM users").all();
console.log(JSON.stringify(users, null, 2));
