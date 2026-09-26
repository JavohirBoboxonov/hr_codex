import User from '../models/User';
import Payment from '../models/Payment';
import crypto from 'crypto';

const generateReferralCode = async (): Promise<string> => {
  let code = '';
  let isUnique = false;
  while (!isUnique) {
    // Generates a code like: LODEXE5F4
    code = 'LODEX' + crypto.randomBytes(2).toString('hex').toUpperCase();
    const existing = await User.findOne({ referralCode: code });
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
};

// Hamkorlik dasturini faollashtirish
export const activatePartner = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
    }

    if (user.isPartner) {
      return res.status(400).json({
        success: false,
        message: 'Hamkorlik dasturi allaqachon faollashtirilgan',
        data: { referralCode: user.referralCode },
      });
    }

    const code = await generateReferralCode();
    user.isPartner = true;
    user.referralCode = code;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Hamkorlik dasturi muvaffaqiyatli faollashtirildi',
      data: { referralCode: code },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server xatosi' });
  }
};

const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  const masked = local[0] + '***';
  return `${masked}@${domain}`;
};

// Shaxsiy kabinet uchun referal statistikasini olish
export const getPartnerStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
    }

    // Taklif qilingan foydalanuvchilar soni
    const referralsCount = await User.countDocuments({ referredBy: userId });

    // Taklif qilingan foydalanuvchilar ro'yxati (lean for performance)
    const referralsList = await User.find({ referredBy: userId })
      .select('fullName email isEmailVerified createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Taklif etilganlarning tasdiqlangan to'lovlari summasi
    let totalSpent = 0;
    let referralsWithSpend: any[] = [];

    if (referralsList.length > 0) {
      const referralIds = referralsList.map((r) => r._id);

      const spendAgg = await Payment.aggregate([
        { $match: { userId: { $in: referralIds }, status: 'Approved' } },
        { $group: { _id: '$userId', amountSpent: { $sum: '$amount' } } },
      ]);

      const spendMap: Record<string, number> = {};
      for (const row of spendAgg) {
        spendMap[row._id.toString()] = row.amountSpent;
      }

      referralsWithSpend = referralsList.map((r) => ({
        fullName: r.fullName,
        email: maskEmail(r.email),
        isEmailVerified: r.isEmailVerified,
        createdAt: r.createdAt,
        amountSpent: spendMap[r._id.toString()] ?? 0,
      }));

      totalSpent = referralsWithSpend.reduce((sum, r) => sum + r.amountSpent, 0);
    }

    const totalEarnings = Math.floor(totalSpent * 0.5);

    res.status(200).json({
      success: true,
      data: {
        isPartner: user.isPartner,
        referralCode: user.referralCode,
        referralsCount,
        referrals: referralsWithSpend,
        totalSpent,
        totalEarnings,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server xatosi' });
  }
};
