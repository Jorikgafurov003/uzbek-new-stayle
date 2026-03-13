import express from 'express';
import { getUsers, updateUser, deleteUser, getUserByFirebaseId } from '../controllers/userController.js';

const router = express.Router();

router.get("/", getUsers);
router.get("/firebase/:uid", getUserByFirebaseId);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
