import express from 'express';
import { getAllCategories, createCategory, deleteCategory } from '../controllers/categoryController.js';
import { authMiddleware, roleGuard } from '../middleware.js';

const router = express.Router();

router.get('/', getAllCategories);
router.post('/', authMiddleware, roleGuard(['admin', 'agent']), createCategory);
router.delete('/:id', authMiddleware, roleGuard(['admin', 'agent']), deleteCategory);

export default router;
