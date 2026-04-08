import express from 'express';
import { getAllBanners, createBanner, deleteBanner } from '../controllers/bannerController.js';
import { authMiddleware, roleGuard } from '../middleware.js';

const router = express.Router();

router.get('/', getAllBanners);
router.post('/', authMiddleware, roleGuard(['admin']), createBanner);
router.delete('/:id', authMiddleware, roleGuard(['admin']), deleteBanner);

export default router;
