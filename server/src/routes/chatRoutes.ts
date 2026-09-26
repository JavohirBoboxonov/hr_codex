import express from 'express';
const router = express.Router();
import * as chatController from '../controllers/chatController';
import { protect, restrictTo } from '../middlewares/authMiddleware';

router.use(protect);
router.use(restrictTo('employer', 'admin'));

router.get('/', chatController.getMessages);
router.post('/:applicationId', chatController.sendMessage);

export default router;
