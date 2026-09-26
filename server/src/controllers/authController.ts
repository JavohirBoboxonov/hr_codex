import User from '../models/User';
import VerificationCode from '../models/VerificationCode';
import { sendVerificationEmail } from '../config/email';
import { generateVerificationCode } from '../utils/generateCode';
import { createErrorResponse, getLanguageFromRequest } from '../utils/errorMessages';
import jwt, { type SignOptions } from 'jsonwebtoken';

const CODE_EXPIRY_MINUTES = 10;

// JWT token yaratish
const createToken = (userId: string, role: string | null) => {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  };
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'hr-lodex-secret-key-2024',
    options
  );
};

// 1. Register - to'liq ism, email, parol
export const register = async (req, res) => {
  try {
    const { fullName, email, password, referralCode } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_REQUIRED_FIELDS', 400));
    }

    const emailNorm = (email || '').trim().toLowerCase();
    const existingUser = await User.findOne({ email: emailNorm });
    if (existingUser) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_EMAIL_EXISTS', 400));
    }

    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        referredBy = referrer._id;
      }
    }

    const user = await User.create({
      fullName: (fullName || '').trim(),
      email: emailNorm,
      password: (password || '').trim(),
      referredBy,
    });

    const code = generateVerificationCode();

    await VerificationCode.findOneAndDelete(
      { email: emailNorm, type: 'register' }
    );

    await VerificationCode.create({
      email: emailNorm,
      code,
      type: 'register',
      expiresAt: new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000),
    });

    const language = getLanguageFromRequest(req);
    await sendVerificationEmail(user.email, code, language, 'verification');

    res.status(201).json({
      success: true,
      message: "Ro'yxatdan o'tdingiz. Elektron pochtangizga tasdiqlash kodi yuborildi.",
      data: {
        userId: user._id,
        email: user.email,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server xatosi',
    });
  }
};

// 2. Email tasdiqlash
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_INVALID_CODE', 400));
    }

    const verification = await VerificationCode.findOne({
      email: email.toLowerCase(),
      type: 'register',
    });

    if (!verification) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_CODE_EXPIRED', 400));
    }

    if (verification.expiresAt < new Date()) {
      await VerificationCode.findByIdAndDelete(verification._id);
      return res.status(400).json(createErrorResponse(req, 'AUTH_CODE_EXPIRED', 400));
    }

    if (verification.code !== code) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_INVALID_CODE', 400));
    }

    await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { isEmailVerified: true }
    );

    await VerificationCode.findByIdAndDelete(verification._id);

    res.status(200).json({
      success: true,
      message: 'Elektron pochta muvaffaqiyatli tasdiqlandi. Endi rol tanlang.',
      data: { email: email.toLowerCase() },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server xatosi',
    });
  }
};

// 3. Kodni qayta yuborish
export const resendCode = async (req, res) => {
  try {
    const { email, type } = req.body;

    if (!email || !type) {
      return res.status(400).json({
        success: false,
        message: 'Elektron pochta va tur (register/login) kiritilishi shart',
      });
    }

    if (!['register', 'login'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type register yoki login bo\'lishi kerak',
      });
    }

    if (type === 'register') {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Foydalanuvchi topilmadi',
        });
      }
      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Elektron pochta allaqachon tasdiqlangan',
        });
      }
    } else {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Foydalanuvchi topilmadi',
        });
      }
    }

    const code = generateVerificationCode();

    await VerificationCode.findOneAndDelete({
      email: email.toLowerCase(),
      type,
    });

    await VerificationCode.create({
      email: email.toLowerCase(),
      code,
      type,
      expiresAt: new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000),
    });

    const language = getLanguageFromRequest(req);
    await sendVerificationEmail(email, code, language, 'verification');

    res.status(200).json({
      success: true,
      message: 'Yangi tasdiqlash kodi elektron pochtangizga yuborildi',
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server xatosi',
    });
  }
};

// 4. Rol tanlash - ish beruvchi yoki nomzod
export const selectRole = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_REQUIRED_FIELDS', 400));
    }

    if (!['employer', 'candidate'].includes(role)) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_INVALID_ROLE', 400));
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json(createErrorResponse(req, 'NOT_FOUND', 404));
    }

    if (!user.isEmailVerified) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_EMAIL_NOT_VERIFIED', 400));
    }

    user.role = role;
    await user.save({ validateBeforeSave: false });

    const token = createToken(user._id.toString(), user.role);

    res.status(200).json({
      success: true,
      message: `Rol tanlandi: ${role === 'employer' ? 'Ish beruvchi' : 'Nomzod'}`,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          interviews: user.interviews || 0,
          freeJobsUsed: user.freeJobsUsed || 0,
        },
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server xatosi',
    });
  }
};

// 5. Login - email, parol -> to'g'ridan-to'g'ri kirish
export const login = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();

    if (!email || !password) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_REQUIRED_FIELDS', 400));
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json(createErrorResponse(req, 'AUTH_INVALID_CREDENTIALS', 401));
    }

    // Email tasdiqlanmagan yoki rol tanlanmagan bo'lsa ham kirishga ruxsat beramiz
    // Default rol sifatida 'candidate' beramiz (agar tanlanmagan bo'lsa)
    const role = user.role || 'candidate';

    const token = createToken(user._id.toString(), role);

    res.status(200).json({
      success: true,
      message: 'Muvaffaqiyatli kirdingiz',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: role,
          interviews: user.interviews || 0,
          freeJobsUsed: user.freeJobsUsed || 0,
        },
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server xatosi',
    });
  }
};

// 6. Login tasdiqlash - kod tekshirish va token qaytarish
export const verifyLogin = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const code = (req.body.code || '').trim();

    if (!email || !code) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_INVALID_CODE', 400));
    }

    const verification = await VerificationCode.findOne({
      email,
      type: 'login',
    });

    if (!verification) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_CODE_EXPIRED', 400));
    }

    if (verification.expiresAt < new Date()) {
      await VerificationCode.findByIdAndDelete(verification._id);
      return res.status(400).json(createErrorResponse(req, 'AUTH_CODE_EXPIRED', 400));
    }

    if (verification.code !== code) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_INVALID_CODE', 400));
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi',
      });
    }

    await VerificationCode.findByIdAndDelete(verification._id);

    const token = createToken(user._id.toString(), user.role);

    res.status(200).json({
      success: true,
      message: 'Muvaffaqiyatli kirdingiz',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          interviews: user.interviews || 0,
          freeJobsUsed: user.freeJobsUsed || 0,
        },
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server xatosi',
    });
  }
};

// 7. Forgot password - email ga kod yuborish
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_REQUIRED_FIELDS', 400));
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json(createErrorResponse(req, 'AUTH_USER_NOT_FOUND', 404));
    }

    const code = generateVerificationCode();

    await VerificationCode.findOneAndDelete({
      email: email.toLowerCase(),
      type: 'reset-password',
    });

    await VerificationCode.create({
      email: email.toLowerCase(),
      code,
      type: 'reset-password',
      expiresAt: new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000),
    });

    const language = getLanguageFromRequest(req);
    await sendVerificationEmail(email, code, language, 'verification');

    res.status(200).json({
      success: true,
      message: 'Parolni tiklash kodi elektron pochtangizga yuborildi',
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server xatosi',
    });
  }
};

// 8. Verify reset code - kodni tekshirish
export const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_INVALID_CODE', 400));
    }

    const verification = await VerificationCode.findOne({
      email: email.toLowerCase(),
      type: 'reset-password',
    });

    if (!verification) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_CODE_EXPIRED', 400));
    }

    if (verification.expiresAt < new Date()) {
      await VerificationCode.findByIdAndDelete(verification._id);
      return res.status(400).json(createErrorResponse(req, 'AUTH_CODE_EXPIRED', 400));
    }

    if (verification.code !== code) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_INVALID_CODE', 400));
    }

    res.status(200).json({
      success: true,
      message: 'Kod to\'g\'ri',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server xatosi',
    });
  }
};

// 9. Reset password - kod va yangi parol bilan parolni yangilash
export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body;

    if (!email || !code || !newPassword || !confirmPassword) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_REQUIRED_FIELDS', 400));
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_PASSWORD_MISMATCH', 400));
    }

    if (newPassword.length < 6) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 400));
    }

    const verification = await VerificationCode.findOne({
      email: email.toLowerCase(),
      type: 'reset-password',
    });

    if (!verification) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_CODE_EXPIRED', 400));
    }

    if (verification.expiresAt < new Date()) {
      await VerificationCode.findByIdAndDelete(verification._id);
      return res.status(400).json(createErrorResponse(req, 'AUTH_CODE_EXPIRED', 400));
    }

    if (verification.code !== code) {
      return res.status(400).json(createErrorResponse(req, 'AUTH_INVALID_CODE', 400));
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json(createErrorResponse(req, 'AUTH_USER_NOT_FOUND', 404));
    }

    user.password = newPassword;
    await user.save();

    await VerificationCode.findByIdAndDelete(verification._id);

    res.status(200).json({
      success: true,
      message: 'Parol muvaffaqiyatli yangilandi',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server xatosi',
    });
  }
};
