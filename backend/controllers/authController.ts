import { AuthService } from '../services/authService.js';

export const login = async (req, res) => {
    const { phone, password } = req.body;
    try {
        const result = await AuthService.login(phone, password);
        res.json(result);
    } catch (e) {
        res.status(401).json({ error: e.message });
    }
};

export const register = async (req, res) => {
    try {
        const result = await AuthService.register(req.body);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

export const getProfile = async (req, res) => {
    // req.user will be populated by authMiddleware
    res.json({ user: req.user });
};
