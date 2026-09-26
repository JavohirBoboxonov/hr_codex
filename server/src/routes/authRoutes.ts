import express from 'express';
const router = express.Router();
import * as authController from '../controllers/authController';

// Register - 1-qadam: to'liq ism, email, parol
router.post('/register', authController.register);

// Email tasdiqlash - 2-qadam
router.post('/verify-email', authController.verifyEmail);

// Kodni qayta yuborish - 3-qadam
router.post('/resend-code', authController.resendCode);

// Rol tanlash - 4-qadam: employer yoki candidate
router.post('/select-role', authController.selectRole);

// Login - 1-qadam: email, parol
router.post('/login', authController.login);

// Login tasdiqlash - 2-qadam: email + kod
router.post('/verify-login', authController.verifyLogin);

// Forgot password - email ga kod yuborish
router.post('/forgot-password', authController.forgotPassword);

// Verify reset code - kodni tekshirish
router.post('/verify-reset-code', authController.verifyResetCode);

// Reset password - kod va yangi parol bilan parolni yangilash
router.post('/reset-password', authController.resetPassword);

export default router;
