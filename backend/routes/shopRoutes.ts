import express from 'express';
import { getAllShops, createShop, updateShop, deleteShop } from '../controllers/shopController.js';
import { authMiddleware, roleGuard } from '../middleware.js';

const router = express.Router();

router.get('/', getAllShops);
router.post('/', authMiddleware, roleGuard(['admin', 'agent']), createShop);
router.put('/:id', authMiddleware, roleGuard(['admin', 'agent']), updateShop);
router.delete('/:id', authMiddleware, roleGuard(['admin', 'agent']), deleteShop);

export default router;
