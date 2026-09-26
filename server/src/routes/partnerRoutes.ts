import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import * as partnerController from '../controllers/partnerController';

const router = express.Router();

router.use(protect);

router.post('/activate', partnerController.activatePartner);
router.get('/stats', partnerController.getPartnerStats);

export default router;
