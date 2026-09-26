import express from 'express';
const router = express.Router();
import * as jobController from '../controllers/jobController';
import * as applicationController from '../controllers/applicationController';
import * as sessionController from '../controllers/sessionController';

import { protect } from '../middlewares/authMiddleware';

// Ochiq endpointlar - token talab qilinmaydi (lekin ba'zilari endi login talab qiladi)

// Barcha ochiq ishlar (Jobs bo'limi)
router.get('/jobs', jobController.getPublicJobs);

// Ishni token orqali olish (intervyu linki uchun)
router.get('/jobs/token/:token', jobController.getPublicJobByToken);

// Bitta ish id bo'yicha (ariza formasi uchun)
router.get('/jobs/:jobId', jobController.getPublicJobById);

// Taklif kodini tekshirish
router.post('/validate-invite', jobController.validateInviteCode);

// Ishga ariza yuborish (nomzodlar uchun) - ENDI LOGIN TALAB QILADI
router.post('/jobs/:jobId/apply', protect, applicationController.applyToJob);

// Rezyumeni AI orqali tahlil qilish - asosiy Gemini kalit backendda qoladi
router.post('/resume/analyze', protect, applicationController.analyzeResume);

// Intervyu sessiyasini boshlash (body: jobId, applicationId?, code?, language?) - ENDI LOGIN TALAB QILADI
router.post('/sessions/start', protect, sessionController.startSession);

// Sessiyani tugatish (javoblar yuboriladi) - ENDI LOGIN TALAB QILADI
router.patch('/sessions/:id/complete', protect, sessionController.completeSession);

// Gemini Live uchun qisqa muddatli token
router.post('/sessions/:id/live-token', protect, sessionController.createLiveToken);

// Intervyu yozuvini yuklash (nomzod tomonidan)
router.post('/sessions/:id/recording', protect, sessionController.uploadRecordingFile, sessionController.uploadRecording);

// S3 multipart yozuv endpointlari
router.post('/sessions/:id/recording/initiate', protect, sessionController.initiateRecording);
router.post('/sessions/:id/recording/chunk', protect, sessionController.uploadRecordingChunk);
router.post('/sessions/:id/recording/complete', protect, sessionController.completeRecording);
router.post('/sessions/:id/recording/abort', protect, sessionController.abortRecording);

// Nomzod tomonidan intervyuga fikr bildirish
router.post('/sessions/:id/candidate-feedback', protect, sessionController.addCandidateFeedback);

export default router;
