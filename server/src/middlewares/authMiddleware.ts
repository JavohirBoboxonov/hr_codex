import jwt from 'jsonwebtoken';
import User from '../models/User';
import type { JwtPayload } from '../types/jwt';

export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Kirish uchun avtorizatsiya talab qilinadi',
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'hr-lodex-secret-key-2024'
    ) as JwtPayload;

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Foydalanuvchi topilmadi',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Noto\'g\'ri token',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token muddati tugagan',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
    });
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu amalni bajarish uchun ruxsat yo\'q',
      });
    }
    next();
  };
};
