import express from 'express';
import { submitOrderRating } from '../controllers/ratingController.js';

const router = express.Router();

router.post("/order/:id", submitOrderRating);

export default router;
