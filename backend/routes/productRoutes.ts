import express from 'express';
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../controllers/productController.js';
import { authMiddleware, roleGuard } from '../middleware.js';

const router = express.Router();

router.get('/', getAllProducts);
router.post('/', authMiddleware, roleGuard(['admin', 'agent']), createProduct);
router.put('/:id', authMiddleware, roleGuard(['admin', 'agent']), updateProduct);
router.delete('/:id', authMiddleware, roleGuard(['admin', 'agent']), deleteProduct);

export default router;
