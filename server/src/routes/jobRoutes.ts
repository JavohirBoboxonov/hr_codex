import express from 'express';
const router = express.Router();
import * as jobController from '../controllers/jobController';
import { protect, restrictTo } from '../middlewares/authMiddleware';

router.use(protect);
router.use(restrictTo('employer', 'admin'));

router.post('/generate-questions', jobController.generateQuestions);
router.get('/', jobController.getJobs);
router.get('/:id', jobController.getJobById);
router.post('/', jobController.createJob);
router.patch('/:id', jobController.updateJob);
router.delete('/:id', jobController.deleteJob);

export default router;
