import User from '../models/User';

// Joriy foydalanuvchi profilini olish (token orqali)
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi',
      });
    }

    const profile = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      interviews: user.interviews ?? 0,
      freeJobsUsed: user.freeJobsUsed ?? 0,
      avatar: user.avatar ?? null,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
      address: user.address ?? '',
      gender: user.gender ?? '',
      education: user.education ?? [],
      workExperience: user.workExperience ?? [],
    };

    res.status(200).json({
      success: true,
      data: { user: profile },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server xatosi',
    });
  }
};

// Profilni yangilash (fullName, avatar, dateOfBirth, address, gender, education, workExperience)
export const updateProfile = async (req, res) => {
  try {
    const allowed = [
      'fullName', 'avatar', 'dateOfBirth', 'address', 'gender',
      'education', 'workExperience',
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.dateOfBirth === '') updates.dateOfBirth = null;
    if (updates.dateOfBirth && typeof updates.dateOfBirth === 'string') {
      const d = new Date(updates.dateOfBirth);
      if (!isNaN(d.getTime())) updates.dateOfBirth = d;
      else updates.dateOfBirth = null;
    }

    if (!Array.isArray(updates.education)) delete updates.education;
    if (!Array.isArray(updates.workExperience)) delete updates.workExperience;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password').lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi',
      });
    }

    const profile = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      interviews: user.interviews ?? 0,
      freeJobsUsed: user.freeJobsUsed ?? 0,
      avatar: user.avatar ?? null,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
      address: user.address ?? '',
      gender: user.gender ?? '',
      education: user.education ?? [],
      workExperience: user.workExperience ?? [],
    };

    res.status(200).json({
      success: true,
      message: 'Profil yangilandi',
      data: { user: profile },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server xatosi',
    });
  }
};

// HR uchun: email orqali candidate profilini olish
export const getCandidateByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email kiritilishi shart',
      });
    }

    // Faqat HR va ADMIN candidate profilini ko'ra oladi
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Ruxsat yo\'q',
      });
    }

    const user = await User.findOne({ 
      email: email.toLowerCase().trim(),
      role: 'candidate'
    })
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Candidate topilmadi',
      });
    }

    const profile = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      interviews: user.interviews ?? 0,
      freeJobsUsed: user.freeJobsUsed ?? 0,
      avatar: user.avatar ?? null,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
      address: user.address ?? '',
      gender: user.gender ?? '',
      education: user.education ?? [],
      workExperience: user.workExperience ?? [],
    };

    res.status(200).json({
      success: true,
      data: { user: profile },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server xatosi',
    });
  }
};
