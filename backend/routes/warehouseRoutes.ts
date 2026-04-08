import express from 'express';
import { getAllWarehouses, createWarehouse, getInventory, updateInventory } from '../controllers/warehouseController.js';
import { authMiddleware, roleGuard } from '../middleware.js';

const router = express.Router();

router.get('/', getAllWarehouses);
router.post('/', authMiddleware, roleGuard(['admin']), createWarehouse);
router.get('/inventory', authMiddleware, getInventory);
router.post('/inventory', authMiddleware, roleGuard(['admin']), updateInventory);

export default router;
