import { Request, Response, NextFunction } from 'express';

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

export const roleGuard = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // In a real app, this would check the JWT/session. 
        // For this prototype, we'll assume the role is passed in the header or body for simplicity
        // but a production app must use verified tokens.
        const userRole = req.headers['x-user-role'] as string;

        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};
