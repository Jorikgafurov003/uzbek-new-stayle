import express from 'express';
import { createOrder, getOrderDetails, getActiveOrders, updateOrderStatus } from '../controllers/orderController.js';
import { authMiddleware, roleGuard } from '../middleware.js';

const router = express.Router();

router.post('/', authMiddleware, roleGuard(['client', 'admin']), createOrder);
router.get('/active', authMiddleware, getActiveOrders);
router.get('/:id', authMiddleware, getOrderDetails);
router.put('/:id/status', authMiddleware, roleGuard(['courier', 'admin']), updateOrderStatus);

export default router;
