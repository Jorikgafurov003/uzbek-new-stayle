import express from 'express';
import { getAllUsers, updateUser, deleteUser } from '../controllers/userController.js';
import { authMiddleware, roleGuard } from '../middleware.js';

const router = express.Router();

router.get('/', authMiddleware, roleGuard(['admin', 'agent']), getAllUsers);
router.put('/:id', authMiddleware, roleGuard(['admin']), updateUser);
router.delete('/:id', authMiddleware, roleGuard(['admin']), deleteUser);

export default router;
