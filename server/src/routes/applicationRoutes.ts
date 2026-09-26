import express from 'express';
const router = express.Router();
import * as applicationController from '../controllers/applicationController';
import { protect, restrictTo } from '../middlewares/authMiddleware';

router.use(protect);

router.get('/my', restrictTo('candidate'), applicationController.getMyApplications);

router.use(restrictTo('employer', 'admin'));

router.get('/', applicationController.getAllApplications);
router.get('/:id', applicationController.getApplicationById);
router.get('/job/:jobId', applicationController.getApplicationsByJob);
router.patch('/:id/status', applicationController.updateApplicationStatus);

export default router;
