import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'uzbechka_super_secret_key_2026';

export const authMiddleware = (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const roleGuard = (allowedRoles: string[]) => {
    return (req: any, res: Response, next: NextFunction) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};

export const validateDTO = (schema: { [key: string]: string }) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const errors: string[] = [];
        Object.keys(schema).forEach(key => {
            const type = schema[key];
            const value = req.body[key];

            if (value === undefined || value === null) {
                errors.push(`${key} is required`);
            } else if (typeof value !== type && !(type === 'number' && !isNaN(Number(value)))) {
                errors.push(`${key} must be a ${type}`);
            }
        });

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }
        next();
    };
};
