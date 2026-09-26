import logger from '../utils/logger';

export default function requestLogger(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const logMeta = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      userId: req.user?._id || req.user?.id,
      role: req.user?.role,
    };

    if (res.statusCode >= 500) {
      logger.error('HTTP request completed', logMeta);
      return;
    }

    if (res.statusCode >= 400) {
      logger.warn('HTTP request completed', logMeta);
      return;
    }

    logger.info('HTTP request completed', logMeta);
  });

  next();
};
