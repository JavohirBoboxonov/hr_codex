import express from 'express';
const router = express.Router();
import * as sessionController from '../controllers/sessionController';
import { protect, restrictTo } from '../middlewares/authMiddleware';

router.use(protect);
router.use(restrictTo('employer', 'admin'));

// Statistika
router.get('/stats', sessionController.getStats);

// Barcha sessiyalar (filter: status, jobId)
router.get('/', sessionController.getAllSessions);

// Ish bo'yicha sessiyalar
router.get('/job/:jobId', sessionController.getSessionsByJob);

// Kandidatning barcha suhbatlari (applicationId yoki sessionId query)
router.get('/candidate-history', sessionController.getCandidateHistory);

// Sessiya to'liq ma'lumotlari (javoblar, baholash)
router.get('/:id/details', sessionController.getSessionDetails);

// Sessiya yozuvini olish (video/audio) – /:id dan oldin
router.get('/:id/recording', sessionController.getRecording);

// Sessiyani ID bo'yicha olish
router.get('/:id', sessionController.getSessionById);

// HR tomonidan intervyuni baholash / fikr bildirish
router.post('/:id/hr-feedback', sessionController.addHrFeedback);

export default router;
