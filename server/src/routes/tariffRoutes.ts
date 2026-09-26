import express from 'express';
const router = express.Router();
import * as tariffController from '../controllers/tariffController';
import { protect, restrictTo } from '../middlewares/authMiddleware';

// Faol tariflar (hammaga ochiq)
router.get('/active', tariffController.getActiveTariffs);

// Admin route'lar
router.use(protect);
router.use(restrictTo('admin'));

router.get('/', tariffController.getAllTariffs);
router.post('/', tariffController.createTariff);
router.patch('/:id', tariffController.updateTariff);
router.delete('/:id', tariffController.deleteTariff);

export default router;
