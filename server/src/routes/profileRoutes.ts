import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import * as profileController from '../controllers/profileController';

const router = express.Router();

router.use(protect);

router.get('/me', profileController.getMe);
router.patch('/me', profileController.updateProfile);
router.get('/candidate', profileController.getCandidateByEmail);

export default router;
