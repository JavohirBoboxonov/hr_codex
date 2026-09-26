import Payment from '../models/Payment';
import Tariff from '../models/Tariff';
import User from '../models/User';
import { generatePaymentUrl, ClickErrors } from '../utils/clickService';

/**
 * Initiate Click payment
 * POST /api/payments/click/initiate
 */
export const initiatePayment = async (req, res) => {
    try {
        const { tariffId, amount } = req.body;
        console.log(`[Click][Initiate] userId=${req.user?._id} tariffId=${tariffId} amount=${amount}`);

        if (!tariffId || !amount) {
            console.warn('[Click][Initiate] Missing tariffId or amount');
            return res.status(400).json({
                success: false,
                message: 'Tarif va miqdor kiritilishi shart',
            });
        }

        // Validate tariff
        const tariff = await Tariff.findById(tariffId);
        if (!tariff || !tariff.isActive) {
            console.warn(`[Click][Initiate] Tariff not found or inactive | tariffId=${tariffId}`);
            return res.status(404).json({
                success: false,
                message: 'Tarif topilmadi yoki faol emas',
            });
        }

        // Validate amount
        if (parseFloat(amount) !== tariff.price) {
            console.warn(`[Click][Initiate] Amount mismatch | requested=${amount} expected=${tariff.price}`);
            return res.status(400).json({
                success: false,
                message: 'Narx mos kelmaydi',
                expectedAmount: tariff.price,
            });
        }

        // Create pending payment record
        const payment = await Payment.create({
            userId: req.user._id,
            tariffId: tariff._id,
            amount: parseFloat(amount),
            interviews: tariff.interviews,
            provider: 'click',
            status: 'Pending',
            clickCreateTime: Math.floor(Date.now() / 1000),
        });

        // Generate Click payment URL
        const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
        const returnUrl = `${frontendBase}/buy-credits?click_payment_id=${payment._id.toString()}`;

        const paymentUrl = generatePaymentUrl({
            merchantId: process.env.CLICK_MERCHANT_ID,
            serviceId: process.env.CLICK_SERVICE_ID,
            transactionParam: payment._id.toString(),
            amount: payment.amount,
            returnUrl,
        });

        console.log(`[Click][Initiate] Payment created | paymentId=${payment._id} amount=${payment.amount} url=${paymentUrl}`);

        res.status(200).json({
            success: true,
            message: 'Click to\'lov URL yaratildi',
            data: {
                paymentId: payment._id.toString(),
                paymentUrl,
                amount: payment.amount,
                interviews: payment.interviews,
            },
        });
    } catch (error) {
        console.error('[Click][Initiate] Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Handle Click Prepare request
 * POST /api/payments/click/prepare
 */
export const handlePrepare = async (req, res) => {
    try {
        const {
            click_trans_id,
            service_id,
            merchant_trans_id,
            amount,
            action,
            sign_time,
            sign_string,
        } = req.body;

        console.log(`[Click][Prepare] Received | click_trans_id=${click_trans_id} merchant_trans_id=${merchant_trans_id} amount=${amount} service_id=${service_id}`);

        // Validate action (URL-encoded bodies are strings, coerce to number)
        if (Number(action) !== 0) {
            console.warn(`[Click][Prepare] Invalid action=${action}, expected 0`);
            return res.json({
                error: ClickErrors.ACTION_NOT_FOUND,
                error_note: 'Invalid action',
            });
        }

        // Find payment by our transaction ID
        const payment = await Payment.findById(merchant_trans_id);

        if (!payment) {
            console.warn(`[Click][Prepare] Payment NOT FOUND | merchant_trans_id=${merchant_trans_id}`);
            return res.json({
                error: ClickErrors.TRANSACTION_NOT_FOUND,
                error_note: 'Payment not found',
            });
        }

        console.log(`[Click][Prepare] Payment found | status=${payment.status} storedAmount=${payment.amount} clickAmount=${amount}`);

        // Check if already paid
        if (payment.status === 'Approved') {
            console.warn(`[Click][Prepare] Already paid | merchant_trans_id=${merchant_trans_id}`);
            return res.json({
                error: ClickErrors.ALREADY_PAID,
                error_note: 'Payment already completed',
            });
        }

        // Validate amount
        if (payment.amount !== parseFloat(amount)) {
            console.warn(`[Click][Prepare] Amount mismatch | stored=${payment.amount} received=${amount}`);
            return res.json({
                error: ClickErrors.INVALID_AMOUNT,
                error_note: 'Amount mismatch',
            });
        }

        // Update payment with prepare info
        payment.clickTransactionId = click_trans_id.toString();
        payment.clickPrepareId = click_trans_id;
        payment.clickStatus = 0; // Prepared
        await payment.save();

        console.log(`[Click][Prepare] Success | merchant_trans_id=${merchant_trans_id} click_trans_id=${click_trans_id}`);

        // Success response
        res.json({
            error: ClickErrors.SUCCESS,
            error_note: 'Success',
            click_trans_id: click_trans_id,
            merchant_trans_id: merchant_trans_id,
            merchant_prepare_id: payment._id.toString(),
        });
    } catch (error) {
        console.error('[Click][Prepare] Error:', error);
        res.json({
            error: ClickErrors.ERROR_IN_REQUEST,
            error_note: error.message,
        });
    }
};

/**
 * Handle Click Complete request
 * POST /api/payments/click/complete
 */
export const handleComplete = async (req, res) => {
    try {
        const {
            click_trans_id,
            service_id,
            merchant_trans_id,
            merchant_prepare_id,
            amount,
            action,
            error: clickError,
            error_note,
            sign_time,
            sign_string,
        } = req.body;

        console.log(`[Click][Complete] Received | click_trans_id=${click_trans_id} merchant_trans_id=${merchant_trans_id} merchant_prepare_id=${merchant_prepare_id} amount=${amount} clickError=${clickError}`);

        // Validate action (URL-encoded bodies are strings, coerce to number)
        if (Number(action) !== 1) {
            console.warn(`[Click][Complete] Invalid action=${action}, expected 1`);
            return res.json({
                error: ClickErrors.ACTION_NOT_FOUND,
                error_note: 'Invalid action',
            });
        }

        // Find payment
        const payment = await Payment.findById(merchant_trans_id).populate('userId');

        if (!payment) {
            console.warn(`[Click][Complete] Payment NOT FOUND | merchant_trans_id=${merchant_trans_id}`);
            return res.json({
                error: ClickErrors.TRANSACTION_NOT_FOUND,
                error_note: 'Payment not found',
            });
        }

        console.log(`[Click][Complete] Payment found | status=${payment.status} storedAmount=${payment.amount} clickAmount=${amount}`);

        // Check if payment was cancelled by Click (clickError arrives as string)
        if (Number(clickError) < 0) {
            console.warn(`[Click][Complete] Payment CANCELLED by Click | clickError=${clickError} note=${error_note}`);
            payment.status = 'Cancelled';
            payment.clickStatus = clickError;
            payment.adminNote = `Click error: ${error_note}`;
            await payment.save();

            return res.json({
                error: ClickErrors.TRANSACTION_CANCELLED,
                error_note: 'Payment cancelled by Click',
                click_trans_id: click_trans_id,
                merchant_trans_id: merchant_trans_id,
            });
        }

        // Check if already completed
        if (payment.status === 'Approved') {
            console.log(`[Click][Complete] Already approved — responding success | merchant_trans_id=${merchant_trans_id}`);
            return res.json({
                error: ClickErrors.SUCCESS,
                error_note: 'Already completed',
                click_trans_id: click_trans_id,
                merchant_trans_id: merchant_trans_id,
                merchant_confirm_id: payment._id.toString(),
            });
        }

        // Complete the payment
        payment.status = 'Approved';
        payment.clickStatus = 1; // Completed
        payment.clickCompleteTime = Math.floor(Date.now() / 1000);
        payment.approvedAt = new Date();
        await payment.save();

        // Add interviews to user
        const user = await User.findById(payment.userId._id);
        if (user) {
            const before = user.interviews || 0;
            user.interviews = before + payment.interviews;
            await user.save();
            console.log(`[Click][Complete] Interviews credited | userId=${user._id} before=${before} added=${payment.interviews} after=${user.interviews}`);
        } else {
            console.error(`[Click][Complete] User NOT FOUND | userId=${payment.userId._id} — interviews NOT credited!`);
        }

        console.log(`[Click][Complete] Success | merchant_trans_id=${merchant_trans_id} amount=${payment.amount}`);

        // Success response
        res.json({
            error: ClickErrors.SUCCESS,
            error_note: 'Success',
            click_trans_id: click_trans_id,
            merchant_trans_id: merchant_trans_id,
            merchant_confirm_id: payment._id.toString(),
        });
    } catch (error) {
        console.error('[Click][Complete] Error:', error);
        res.json({
            error: ClickErrors.ERROR_IN_REQUEST,
            error_note: error.message,
        });
    }
};

/**
 * Handle user return from Click payment page
 * GET /api/payments/click/callback
 */
export const handleCallback = async (req, res) => {
    try {
        const { merchant_trans_id } = req.query;

        if (!merchant_trans_id) {
            return res.status(400).json({
                success: false,
                message: 'Transaction ID topilmadi',
            });
        }

        const payment = await Payment.findById(merchant_trans_id)
            .populate('tariffId', 'name price interviews');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'To\'lov topilmadi',
            });
        }

        if (req.user.role !== 'admin' && payment.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Ruxsat yo\'q',
            });
        }

        res.status(200).json({
            success: true,
            data: {
                paymentId: payment._id.toString(),
                status: payment.status,
                amount: payment.amount,
                interviews: payment.interviews,
                tariff: payment.tariffId ? (() => {
                    const tariff = payment.tariffId as unknown as import('../models/Tariff').ITariffDocument;
                    return { name: tariff.name, price: tariff.price };
                })() : null,
                createdAt: payment.createdAt,
                approvedAt: payment.approvedAt,
            },
        });
    } catch (error) {
        console.error('Click callback error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
