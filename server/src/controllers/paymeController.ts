import Payment from '../models/Payment';
import Tariff from '../models/Tariff';
import User from '../models/User';
import { createErrorResponse } from '../utils/errorMessages';
import logger from '../utils/logger';

// Payme constants
const PAYME_MERCHANT_ID = process.env.PAYME_MERCHANT_ID;
const PAYME_KEY = process.env.PAYME_KEY;
const PAYME_CHECKOUT_URL = process.env.PAYME_CHECKOUT_URL || 'https://checkout.paycom.uz';

const PAYME_ERRORS = {
  UNAUTHORIZED: {
    code: -32504,
    message: {
      uz: 'Autentifikatsiya xatosi',
      ru: 'Ошибка аутентификации',
      en: 'Authentication failed',
    },
  },
  METHOD_NOT_FOUND: {
    code: -32601,
    message: {
      uz: 'Usul topilmadi',
      ru: 'Метод не найден',
      en: 'Method not found',
    },
  },
  TRANSACTION_NOT_FOUND: {
    code: -31003,
    message: {
      uz: 'Transaksiya topilmadi',
      ru: 'Транзакция не найдена',
      en: 'Transaction not found',
    },
  },
  ORDER_NOT_FOUND: {
    code: -31050,
    message: {
      uz: 'Buyurtma topilmadi',
      ru: 'Заказ не найден',
      en: 'Order not found',
    },
  },
  ORDER_PAYED: {
    code: -31051,
    message: {
      uz: 'Buyurtma allaqachon toʻlangan',
      ru: 'Заказ уже оплачен',
      en: 'Order already paid',
    },
  },
  ORDER_IN_PROGRESS: {
    code: -31099,
    message: {
      uz: 'Buyurtma bo\'yicha boshqa tranzaksiya qayta ishlanmoqda',
      ru: 'По заказу уже выполняется другая транзакция',
      en: 'Another transaction is already processing this order',
    },
  },
  ORDER_BLOCKED: {
    code: -31050,
    message: {
      uz: 'Buyurtma bloklangan',
      ru: 'Заказ заблокирован',
      en: 'Order is blocked',
    },
  },
  AMOUNT_MISMATCH: {
    code: -31001,
    message: {
      uz: 'Toʻlov summasi notoʻgʻri',
      ru: 'Неверная сумма платежа',
      en: 'Incorrect amount',
    },
  },
  CANNOT_PERFORM: {
    code: -31008,
    message: {
      uz: 'Tranzaksiyani bajarib bo‘lmaydi',
      ru: 'Невозможно выполнить транзакцию',
      en: 'Cannot perform transaction',
    },
  },
};

function jsonRpcError(res, id, err, data?: unknown) {
  const errorObj = typeof err === 'object' ? err : PAYME_ERRORS[err] || PAYME_ERRORS.ORDER_NOT_FOUND;
  return sendJsonRpc(res, {
    jsonrpc: '2.0',
    id: id || null,
    error: {
      code: errorObj.code,
      message: errorObj.message,
      data,
    },
  });
}

function jsonRpcResult(res, id, result) {
  return sendJsonRpc(res, {
    jsonrpc: '2.0',
    id: id || null,
    result,
  });
}

function sendJsonRpc(res, payload) {
  const body = JSON.stringify(payload);
  res.status(200);
  res.set('Content-Type', 'application/json; charset=utf-8');
  res.set('Content-Length', Buffer.byteLength(body).toString());
  return res.end(body);
}

function requirePaymeAuth(req) {
  const header = req.headers['authorization'] || '';
  if (!header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const [login, password] = decoded.split(':');
  if (login !== 'Paycom') return false;
  return password === PAYME_KEY;
}

function toTiyin(amount) {
  return Math.round(Number(amount) * 100);
}

function normalizeTimestamp(value, fallback = 0) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return Math.trunc(n);
  const f = Number(fallback);
  if (Number.isFinite(f) && f > 0) return Math.trunc(f);
  return 0;
}

function wasPaymentPerformed(payment) {
  return (
    payment?.paymeState === 2 ||
    payment?.status === 'Approved' ||
    Boolean(payment?.approvedAt) ||
    normalizeTimestamp(payment?.paymePerformTime) > 0
  );
}

// Employer initiates Payme payment, returns checkout URL
export const initiatePayment = async (req, res) => {
  try {
    const { tariffId } = req.body;
    logger.info('Payme initiate requested', {
      userId: req.user?._id,
      role: req.user?.role,
      tariffId,
      checkoutUrl: PAYME_CHECKOUT_URL,
    });

    if (!tariffId) {
      logger.warn('Payme initiate failed: tariffId missing', { userId: req.user?._id });
      return res.status(400).json(createErrorResponse(req, 'PAYMENT_TARIFF_ID_REQUIRED', 400));
    }

    if (!PAYME_MERCHANT_ID || !PAYME_KEY) {
      logger.error('Payme config is incomplete', {
        hasMerchantId: Boolean(PAYME_MERCHANT_ID),
        hasPaymeKey: Boolean(PAYME_KEY),
      });
      return res.status(500).json({ success: false, message: 'Payme konfiguratsiyasi to\'liq emas' });
    }

    const tariff = await Tariff.findById(tariffId);
    if (!tariff || !tariff.isActive) {
      return res.status(404).json(createErrorResponse(req, 'PAYMENT_TARIFF_NOT_FOUND', 404));
    }

    const payment = await Payment.create({
      userId: req.user._id,
      tariffId: tariff._id,
      amount: tariff.price,
      interviews: tariff.interviews,
      provider: 'payme',
      status: 'Pending',
    });

    const payload = Buffer.from(JSON.stringify({
      merchant_id: PAYME_MERCHANT_ID,
      amount: toTiyin(tariff.price),
      account: { payment_id: payment._id.toString() },
    })).toString('base64');

    const payUrl = `${PAYME_CHECKOUT_URL}/${encodeURIComponent(payload)}`;

    logger.info('Payme initiate succeeded', {
      paymentId: payment._id.toString(),
      amount: payment.amount,
      interviews: payment.interviews,
      payUrlPrefix: payUrl.slice(0, 64),
      payloadLength: payload.length,
      payloadHasSlash: payload.includes('/'),
      payloadHasPlus: payload.includes('+'),
      merchantId: PAYME_MERCHANT_ID,
    });

    return res.status(201).json({
      success: true,
      data: {
        paymentId: payment._id,
        payUrl,
        amount: payment.amount,
        interviews: payment.interviews,
      },
    });
  } catch (error) {
    logger.error('Payme initiate exception', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
    });
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Payme merchant API handler
export const handleMerchantCallback = async (req, res) => {
  const { id, method, params } = req.body || {};

  logger.info('Payme merchant callback received', {
    method,
    id,
    transactionId: params?.id,
    accountPaymentId: params?.account?.payment_id,
    amount: params?.amount,
    fromIp: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
  });

  if (!requirePaymeAuth(req)) {
    logger.warn('Payme merchant callback unauthorized', {
      method,
      id,
      hasAuthHeader: Boolean(req.headers['authorization']),
    });
    return jsonRpcError(res, id, PAYME_ERRORS.UNAUTHORIZED);
  }

  try {
    switch (method) {
      case 'CheckPerformTransaction':
        return handleCheckPerform(req, res, id, params);
      case 'CreateTransaction':
        return handleCreate(req, res, id, params);
      case 'PerformTransaction':
        return handlePerform(req, res, id, params);
      case 'CancelTransaction':
        return handleCancel(req, res, id, params);
      case 'CheckTransaction':
        return handleCheck(req, res, id, params);
      case 'GetStatement':
        return handleStatement(req, res, id, params);
      default:
        logger.warn('Payme merchant callback method not found', { method, id });
        return jsonRpcError(res, id, PAYME_ERRORS.METHOD_NOT_FOUND);
    }
  } catch (error) {
    logger.error('Payme merchant callback exception', {
      method,
      id,
      error: error.message,
      stack: error.stack,
    });
    return sendJsonRpc(res, {
      jsonrpc: '2.0',
      id,
      error: { code: -32400, message: { en: error.message } },
    });
  }
};

async function findPaymentFromAccount(account) {
  if (!account || !account.payment_id) return null;
  return Payment.findById(account.payment_id).populate('userId');
}

async function handleCheckPerform(req, res, id, params) {
  const payment = await findPaymentFromAccount(params.account);
  if (!payment) return jsonRpcError(res, id, PAYME_ERRORS.ORDER_NOT_FOUND, 'payment_id');

  if (payment.status === 'Approved' || payment.paymeState === 2) {
    return jsonRpcError(res, id, PAYME_ERRORS.ORDER_PAYED, 'payment_id');
  }

  if (payment.status === 'Cancelled' || payment.status === 'Rejected' || payment.paymeState === -1 || payment.paymeState === -2) {
    return jsonRpcError(res, id, PAYME_ERRORS.ORDER_BLOCKED, 'payment_id');
  }

  if (payment.paymeTransactionId && payment.paymeState === 1) {
    return jsonRpcError(res, id, PAYME_ERRORS.ORDER_IN_PROGRESS, 'transaction');
  }

  if (params.amount !== toTiyin(payment.amount)) {
    return jsonRpcError(res, id, PAYME_ERRORS.AMOUNT_MISMATCH, 'amount');
  }

  return jsonRpcResult(res, id, { allow: true });
}

async function handleCreate(req, res, id, params) {
  const payment = await findPaymentFromAccount(params.account);
  if (!payment) return jsonRpcError(res, id, PAYME_ERRORS.ORDER_NOT_FOUND, 'payment_id');

  if (payment.status === 'Approved' || payment.paymeState === 2) {
    return jsonRpcError(res, id, PAYME_ERRORS.ORDER_PAYED, 'payment_id');
  }

  if (payment.status === 'Cancelled' || payment.status === 'Rejected' || payment.paymeState === -1 || payment.paymeState === -2) {
    return jsonRpcError(res, id, PAYME_ERRORS.ORDER_BLOCKED, 'payment_id');
  }

  if (params.amount !== toTiyin(payment.amount)) {
    return jsonRpcError(res, id, PAYME_ERRORS.AMOUNT_MISMATCH, 'amount');
  }

  // Already tied to another Payme transaction
  if (payment.paymeTransactionId && payment.paymeTransactionId !== params.id) {
    const duplicateError = payment.paymeState === 2
      ? PAYME_ERRORS.ORDER_PAYED
      : PAYME_ERRORS.ORDER_IN_PROGRESS;
    return jsonRpcError(res, id, duplicateError, 'transaction');
  }

  // If already performed, return existing state
  if (payment.paymeState === 2) {
    return jsonRpcResult(res, id, serializeTransaction(payment));
  }

  payment.paymeTransactionId = params.id;
  payment.paymeCreateTime = normalizeTimestamp(params.time, Date.now());
  payment.paymeState = 1; // created
  payment.paymeAccount = params.account;
  await payment.save();

  return jsonRpcResult(res, id, serializeTransaction(payment));
}

async function handlePerform(req, res, id, params) {
  const payment = await findPaymentByTransactionId(params.id, {
    populateUser: true,
    allowLegacyObjectIdLookup: true,
  });
  if (!payment) return jsonRpcError(res, id, PAYME_ERRORS.TRANSACTION_NOT_FOUND, 'transaction');

  if (payment.paymeState === -1 || payment.paymeState === -2 || payment.status === 'Cancelled' || payment.status === 'Rejected') {
    return jsonRpcError(res, id, PAYME_ERRORS.CANNOT_PERFORM, 'transaction');
  }

  if (payment.paymeState === 2) {
    return jsonRpcResult(res, id, serializeTransaction(payment));
  }

  payment.paymeState = 2;
  payment.paymePerformTime = normalizeTimestamp(params.time, Date.now());
  payment.status = 'Approved';
  payment.approvedAt = new Date();
  await payment.save();

  const payUser = payment.userId as unknown as import('../models/User').IUserDocument | null;
  if (payUser && typeof payUser.save === 'function') {
    payUser.interviews = (payUser.interviews || 0) + payment.interviews;
    await payUser.save();
  }

  return jsonRpcResult(res, id, serializeTransaction(payment));
}

async function handleCancel(req, res, id, params) {
  const payment = await findPaymentByTransactionId(params.id, {
    populateUser: true,
    allowLegacyObjectIdLookup: true,
  });
  if (!payment) return jsonRpcError(res, id, PAYME_ERRORS.TRANSACTION_NOT_FOUND, 'transaction');

  const performed = wasPaymentPerformed(payment);

  // If already cancelled
  if (payment.paymeState === -1 || payment.paymeState === -2) {
    if (payment.paymeState === -1 && performed) {
      payment.paymeState = -2;
      payment.paymeCancelTime = normalizeTimestamp(payment.paymeCancelTime, Date.now());
      await payment.save();
    }
    return jsonRpcResult(res, id, serializeTransaction(payment));
  }

  const wasPerformed = performed;
  payment.paymeState = wasPerformed ? -2 : -1;
  payment.paymeCancelTime = normalizeTimestamp(params.time, Date.now());
  payment.paymeReason = params.reason;
  payment.status = 'Cancelled';

  // If interviews were added before and now cancelled, rollback
  const payUser = payment.userId as unknown as import('../models/User').IUserDocument | null;
  if (wasPerformed && payUser && typeof payUser.save === 'function') {
    payUser.interviews = Math.max(0, (payUser.interviews || 0) - payment.interviews);
    await payUser.save();
  }

  await payment.save();

  return jsonRpcResult(res, id, serializeTransaction(payment));
}

async function handleCheck(req, res, id, params) {
  const payment = await findPaymentByTransactionId(params.id, {
    allowLegacyObjectIdLookup: true,
  });
  if (!payment) return jsonRpcError(res, id, PAYME_ERRORS.TRANSACTION_NOT_FOUND, 'transaction');

  return jsonRpcResult(res, id, serializeTransaction(payment));
}

async function handleStatement(req, res, id, params) {
  const from = params.from || 0;
  const to = params.to || Date.now();
  const payments = await Payment.find({
    paymeTransactionId: { $ne: null },
    paymeCreateTime: { $gte: from, $lte: to },
  });

  return jsonRpcResult(res, id, {
    transactions: payments.map(p => serializeTransaction(p)),
  });
}

function serializeTransaction(payment) {
  const normalizedState = (payment.paymeState === -1 && wasPaymentPerformed(payment))
    ? -2
    : (payment.paymeState ?? 1);

  const createTime = normalizeTimestamp(
    payment.paymeCreateTime,
    payment.createdAt?.getTime() || Date.now()
  );
  const performTime = normalizedState === 2 || normalizedState === -2
    ? normalizeTimestamp(
      payment.paymePerformTime,
      payment.approvedAt?.getTime() || payment.updatedAt?.getTime() || createTime
    )
    : 0;
  const cancelTime = normalizedState === -1 || normalizedState === -2
    ? normalizeTimestamp(
      payment.paymeCancelTime,
      payment.updatedAt?.getTime() || createTime
    )
    : 0;

  return {
    transaction: payment.paymeTransactionId || payment._id.toString(),
    create_time: createTime,
    perform_time: performTime,
    cancel_time: cancelTime,
    state: normalizedState,
    reason: payment.paymeReason || null,
    receivers: null,
  };
}

async function findPaymentByTransactionId(
  transactionId: string,
  options: { populateUser?: boolean; allowLegacyObjectIdLookup?: boolean } = {}
) {
  const query = { paymeTransactionId: transactionId };
  let finder = Payment.findOne(query).sort({ updatedAt: -1, createdAt: -1 });
  if (options.populateUser) finder = finder.populate('userId');
  let payment = await finder;

  if (payment) return payment;

  if (options.allowLegacyObjectIdLookup && typeof transactionId === 'string' && /^[a-f\d]{24}$/i.test(transactionId)) {
    payment = options.populateUser
      ? await Payment.findById(transactionId).populate('userId')
      : await Payment.findById(transactionId);
  }

  return payment;
}
