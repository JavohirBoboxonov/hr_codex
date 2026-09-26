import crypto from 'crypto';

/**
 * Click Payment Service Utility
 * Documentation: https://docs.click.uz
 */

const CLICK_BASE_URL = 'https://my.click.uz/services/pay';

/**
 * Generate SHA-1 digest for Click authentication
 * @param {number} timestamp - Unix timestamp
 * @param {string} secretKey - Click secret key
 * @returns {string} - SHA-1 digest
 */
function generateDigest(timestamp, secretKey) {
    const data = `${timestamp}${secretKey}`;
    return crypto.createHash('sha1').update(data).digest('hex');
}

/**
 * Generate Click payment URL
 * @param {Object} params - Payment parameters
 * @param {string} params.merchantId - Click merchant ID
 * @param {string} params.serviceId - Click service ID
 * @param {string} params.transactionParam - Our payment ID
 * @param {number} params.amount - Payment amount in UZS
 * @param {string} params.returnUrl - URL to redirect user after payment
 * @returns {string} - Click payment URL
 */
function generatePaymentUrl({ merchantId, serviceId, transactionParam, amount, returnUrl }) {
    const params = new URLSearchParams({
        service_id: serviceId,
        merchant_id: merchantId,
        amount: amount.toString(),
        transaction_param: transactionParam,
        return_url: returnUrl,
    });

    return `${CLICK_BASE_URL}?${params.toString()}`;
}

/**
 * Validate Click webhook signature
 * @param {Object} params - Request parameters
 * @param {string} secretKey - Click secret key
 * @returns {boolean} - True if signature is valid
 */
function validateSignature(params, secretKey) {
    if (!params || !secretKey) return false;

    const {
        click_trans_id,
        service_id,
        merchant_trans_id,
        amount,
        action,
        sign_time,
        sign_string,
        merchant_prepare_id,
        error,
    } = params;

    if (!click_trans_id || !service_id || !merchant_trans_id || !amount || action === undefined || !sign_time || !sign_string) {
        return false;
    }

    const signPayload = [
        click_trans_id,
        service_id,
        secretKey,
        merchant_trans_id,
        amount,
        action,
        sign_time,
    ];

    if (merchant_prepare_id !== undefined) signPayload.push(merchant_prepare_id);
    if (error !== undefined) signPayload.push(error);

    const expected = crypto.createHash('md5').update(signPayload.join('')).digest('hex');
    return expected === String(sign_string).toLowerCase();
}

/**
 * Generate Auth header for Click API requests
 * @param {string} merchantUserId - Click merchant user ID
 * @param {string} secretKey - Click secret key
 * @returns {string} - Auth header value
 */
function generateAuthHeader(merchantUserId, secretKey) {
    const timestamp = Math.floor(Date.now() / 1000);
    const digest = generateDigest(timestamp, secretKey);
    return `${merchantUserId}:${digest}:${timestamp}`;
}

/**
 * Click error codes
 */
const ClickErrors = {
    SUCCESS: 0,
    SIGN_CHECK_FAILED: -1,
    INVALID_AMOUNT: -2,
    ACTION_NOT_FOUND: -3,
    ALREADY_PAID: -4,
    USER_NOT_FOUND: -5,
    TRANSACTION_NOT_FOUND: -6,
    FAILED_TO_UPDATE: -7,
    ERROR_IN_REQUEST: -8,
    TRANSACTION_CANCELLED: -9,
};

export {
    generatePaymentUrl,
    generateDigest,
    generateAuthHeader,
    validateSignature,
    ClickErrors,
};
