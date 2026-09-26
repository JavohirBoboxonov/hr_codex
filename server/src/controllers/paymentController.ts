import Payment from '../models/Payment';
import Tariff from '../models/Tariff';
import User from '../models/User';
import { createErrorResponse } from '../utils/errorMessages';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const RECEIPTS_DIR = path.join(__dirname, '../../uploads/receipts');
if (!fs.existsSync(RECEIPTS_DIR)) {
  fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
}

const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(RECEIPTS_DIR)) fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
    cb(null, RECEIPTS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  },
});

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm (JPEG, PNG) yoki PDF fayllar qabul qilinadi'));
    }
  },
}).single('receipt');

// HR: to'lov yaratish (chek bilan)
export const createPayment = async (req, res) => {
  try {
    const { tariffId, amount } = req.body;

    if (!tariffId || !amount) {
      return res.status(400).json(createErrorResponse(req, 'PAYMENT_TARIFF_ID_REQUIRED', 400));
    }

    const tariff = await Tariff.findById(tariffId);
    if (!tariff || !tariff.isActive) {
      return res.status(404).json(createErrorResponse(req, 'PAYMENT_TARIFF_NOT_FOUND', 404));
    }

    if (parseFloat(amount) !== tariff.price) {
      return res.status(400).json(createErrorResponse(req, 'PAYMENT_AMOUNT_MISMATCH', 400, {
        expectedAmount: tariff.price,
      }));
    }

    if (!req.file) {
      return res.status(400).json(createErrorResponse(req, 'PAYMENT_RECEIPT_REQUIRED', 400));
    }

    const payment = await Payment.create({
      userId: req.user._id,
      tariffId: tariff._id,
      amount: parseFloat(amount),
      interviews: tariff.interviews,
      receiptPath: req.file.filename,
      receiptFileName: req.file.originalname,
      status: 'Pending',
    });

    res.status(201).json({
      success: true,
      message: 'To\'lov muvaffaqiyatli yuborildi. Admin tekshirgandan keyin suhbatlar hisobingizga qo\'shiladi.',
      data: {
        id: payment._id.toString(),
        amount: payment.amount,
        interviews: payment.interviews,
        status: payment.status,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    if (req.file) {
      const filePath = path.join(RECEIPTS_DIR, req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Legacy/manual to'lovlar uchun bekor qilish (admin)
export const cancelPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json(createErrorResponse(req, 'PAYMENT_NOT_FOUND', 404));

    payment.status = 'Cancelled';
    payment.rejectedAt = new Date();
    await payment.save();

    res.status(200).json({ success: true, message: 'To\'lov bekor qilindi' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: barcha to'lovlarni ko'rish
export const getAllPayments = async (req, res) => {
  try {
    const { status } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const payments = await Payment.find(filter)
      .populate('userId', 'fullName email')
      .populate('tariffId', 'name price interviews')
      .populate('approvedBy', 'fullName email')
      .sort({ createdAt: -1 });

    const paymentsData = payments.map(p => {
      const user = p.userId as unknown as import('../models/User').IUserDocument | null;
      const tariff = p.tariffId as unknown as import('../models/Tariff').ITariffDocument | null;
      const approver = p.approvedBy as unknown as import('../models/User').IUserDocument | null;

      return {
      id: p._id.toString(),
      user: user ? {
        id: user._id.toString(),
        name: user.fullName,
        email: user.email,
      } : null,
      tariff: tariff ? {
        id: tariff._id.toString(),
        name: tariff.name,
        price: tariff.price,
        interviews: tariff.interviews,
      } : null,
      amount: p.amount,
      interviews: p.interviews,
      status: p.status,
      receiptPath: p.receiptPath ? `/api/payments/${p._id}/receipt` : null,
      receiptFileName: p.receiptFileName,
      adminNote: p.adminNote,
      approvedBy: approver ? {
        id: approver._id.toString(),
        name: approver.fullName,
      } : null,
      approvedAt: p.approvedAt,
      rejectedAt: p.rejectedAt,
      createdAt: p.createdAt,
    };
    });

    res.status(200).json({
      success: true,
      data: paymentsData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: to'lovni tasdiqlash
export const approvePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const payment = await Payment.findById(id)
      .populate('userId')
      .populate('tariffId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'To\'lov topilmadi',
      });
    }

    if (payment.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `To'lov allaqachon ${payment.status === 'Approved' ? 'tasdiqlangan' : 'rad etilgan'}`,
      });
    }

    payment.status = 'Approved';
    payment.approvedBy = req.user._id;
    payment.approvedAt = new Date();
    if (adminNote) payment.adminNote = adminNote;
    await payment.save();

    // Foydalanuvchiga suhbatlar qo'shish
    const user = await User.findById(payment.userId._id);
    if (user) {
      user.interviews = (user.interviews || 0) + payment.interviews;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'To\'lov tasdiqlandi va suhbatlar foydalanuvchi hisobiga qo\'shildi',
      data: {
        id: payment._id.toString(),
        status: payment.status,
        interviewsAdded: payment.interviews,
        userInterviews: user.interviews,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: to'lovni rad etish
export const rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    if (!adminNote) {
      return res.status(400).json(createErrorResponse(req, 'PAYMENT_REJECTION_REASON_REQUIRED', 400));
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json(createErrorResponse(req, 'PAYMENT_NOT_FOUND', 404));
    }

    if (payment.status !== 'Pending') {
      return res.status(400).json(createErrorResponse(req, 'PAYMENT_ALREADY_PROCESSED', 400));
    }

    payment.status = 'Rejected';
    payment.adminNote = adminNote;
    payment.rejectedAt = new Date();
    await payment.save();

    res.status(200).json({
      success: true,
      message: 'To\'lov rad etildi',
      data: {
        id: payment._id.toString(),
        status: payment.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// To'lov chekini olish
export const getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);

    if (!payment || !payment.receiptPath) {
      return res.status(404).json(createErrorResponse(req, 'NOT_FOUND', 404));
    }

    // Admin yoki to'lov egasi ko'ra oladi
    if (req.user.role !== 'admin' && payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json(createErrorResponse(req, 'FORBIDDEN', 403));
    }

    const filePath = path.join(RECEIPTS_DIR, payment.receiptPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json(createErrorResponse(req, 'NOT_FOUND', 404));
    }

    res.sendFile(path.resolve(filePath));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Foydalanuvchi: o'z to'lovlarini ko'rish
export const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .populate('tariffId', 'name price interviews')
      .populate('approvedBy', 'fullName')
      .sort({ createdAt: -1 });

    const paymentsData = payments.map(p => {
      const tariff = p.tariffId as unknown as import('../models/Tariff').ITariffDocument;
      return {
      id: p._id.toString(),
      tariff: {
        name: tariff.name,
        price: tariff.price,
        interviews: tariff.interviews,
      },
      amount: p.amount,
      interviews: p.interviews,
      status: p.status,
      adminNote: p.adminNote,
      approvedAt: p.approvedAt,
      rejectedAt: p.rejectedAt,
      createdAt: p.createdAt,
    };
    });

    res.status(200).json({
      success: true,
      data: paymentsData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadReceiptMiddleware = uploadReceipt;
