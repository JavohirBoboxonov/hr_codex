/**
 * Click Webhook Authentication Middleware
 * Validates requests from Click servers
 */

import { validateSignature } from '../utils/clickService';

const clickWebhookAuth = (req, res, next) => {
    try {
        const secretKey = process.env.CLICK_SECRET_KEY;
        const strictMode = String(process.env.CLICK_WEBHOOK_STRICT || 'false').toLowerCase() === 'true';
        const action = req.body?.action === 0 ? 'PREPARE' : req.body?.action === 1 ? 'COMPLETE' : `action=${req.body?.action}`;

        console.log(`[Click][${action}] Webhook received | merchant_trans_id=${req.body?.merchant_trans_id} click_trans_id=${req.body?.click_trans_id} amount=${req.body?.amount} sign_time=${req.body?.sign_time}`);

        if (!secretKey) {
            console.error('[Click] CLICK_SECRET_KEY is not configured — cannot validate webhook');
            return res.json({
                error: -1,
                error_note: 'Configuration error',
            });
        }

        const { sign_string, sign_time } = req.body;

        if (!sign_string || !sign_time) {
            console.warn(`[Click][${action}] Webhook missing signature parameters: sign_string=${sign_string} sign_time=${sign_time}`);
            if (strictMode) {
                return res.json({ error: -1, error_note: 'Invalid signature' });
            }
        }

        const isValid = validateSignature(req.body, secretKey);

        if (!isValid) {
            console.warn(`[Click][${action}] Signature validation FAILED | received sign_string=${sign_string} | body=${JSON.stringify(req.body)}`);
            if (strictMode) {
                return res.json({ error: -1, error_note: 'Invalid signature' });
            }
        } else {
            console.log(`[Click][${action}] Signature valid ✓`);
        }

        next();
    } catch (error) {
        console.error('[Click] Webhook auth error:', error);
        res.json({
            error: -8,
            error_note: 'Authentication error',
        });
    }
};

export default clickWebhookAuth;
