import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from '../database/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'uzbechka_super_secret_key_2026';

export class AuthService {
    static async login(phone: string, password: string) {
        const user: any = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
        if (!user) throw new Error('Пользователь не найден');

        // Try bcrypt first, then fallback to plaintext for legacy users
        let isMatch = false;
        try {
            isMatch = await bcrypt.compare(password, user.password);
        } catch {
            // If bcrypt fails (e.g. non-bcrypt hash), try direct comparison
        }

        if (!isMatch) {
            // Legacy plaintext password fallback
            if (user.password === password) {
                // Auto-upgrade to bcrypt for future logins
                const hashed = await bcrypt.hash(password, 10);
                db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, user.id);
                isMatch = true;
            }
        }

        if (!isMatch) throw new Error('Неверный пароль');

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        const { password: _, ...userWithoutPassword } = user;
        return { token, user: userWithoutPassword };
    }

    static async register(userData) {
        const { name, phone, password, role = 'client' } = userData;

        const existingUser = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
        if (existingUser) throw new Error('Пользователь с таким номером уже существует');

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = db.prepare(
            'INSERT INTO users (name, phone, password, role, status) VALUES (?, ?, ?, ?, ?)'
        ).run(name, phone, hashedPassword, role, 'active');

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        const { password: _, ...userWithoutPassword } = user;
        return { token, user: userWithoutPassword };
    }

    static verifyToken(token) {
        return jwt.verify(token, JWT_SECRET);
    }
}
