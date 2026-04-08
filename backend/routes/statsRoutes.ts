import express from 'express';
import { getDashboardStats, getTopStats } from '../controllers/statsController.js';
import { authMiddleware, roleGuard } from '../middleware.js';

const router = express.Router();

router.get('/', authMiddleware, roleGuard(['admin', 'agent']), getDashboardStats);
router.get('/top', authMiddleware, roleGuard(['admin']), getTopStats);

export default router;
