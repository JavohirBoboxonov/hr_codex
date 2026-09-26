import express from 'express';
import paymeWebhookAuth from '../middlewares/paymeWebhookAuth';
import clickWebhookAuth from '../middlewares/clickWebhookAuth';
import * as paymentController from '../controllers/paymentController';
import * as paymeController from '../controllers/paymeController';
import * as clickController from '../controllers/clickController';
import { protect, restrictTo } from '../middlewares/authMiddleware';

const router = express.Router();

// HR lar uchun to'lovlar
router.post(
  '/create',
  protect,
  restrictTo('employer'),
  paymentController.uploadReceiptMiddleware,
  paymentController.createPayment
);

// Payme (Paycom) orqali to'lovni boshlash
router.post(
  '/payme/initiate',
  protect,
  restrictTo('employer'),
  paymeController.initiatePayment
);

// Click orqali to'lovni boshlash
router.post(
  '/click/initiate',
  protect,
  restrictTo('employer'),
  clickController.initiatePayment
);

router.get(
  '/my-payments',
  protect,
  restrictTo('employer'),
  paymentController.getMyPayments
);

// Admin route'lar
router.get(
  '/',
  protect,
  restrictTo('admin'),
  paymentController.getAllPayments
);

router.patch(
  '/:id/approve',
  protect,
  restrictTo('admin'),
  paymentController.approvePayment
);

router.patch(
  '/:id/reject',
  protect,
  restrictTo('admin'),
  paymentController.rejectPayment
);

router.patch(
  '/:id/cancel',
  protect,
  restrictTo('admin'),
  paymentController.cancelPayment
);

// Chek olish (admin yoki to'lov egasi)
router.get(
  '/:id/receipt',
  protect,
  paymentController.getReceipt
);

// Payme merchant callback (Basic Auth orqali himoyalangan)
router.post(
  '/payme/merchant',
  paymeWebhookAuth,
  paymeController.handleMerchantCallback
);

// Click prepare webhook (Click servers call this)
router.post(
  '/click/prepare',
  clickWebhookAuth,
  clickController.handlePrepare
);

// Click complete webhook (Click servers call this)
router.post(
  '/click/complete',
  clickWebhookAuth,
  clickController.handleComplete
);

// Click callback (user returns from Click payment page)
router.get(
  '/click/callback',
  protect,
  clickController.handleCallback
);

export default router;

