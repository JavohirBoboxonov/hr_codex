import Job from '../models/Job';
import Application from '../models/Application';
import User from '../models/User';
import { jobToResponse } from '../utils/transform';
import { createErrorResponse } from '../utils/errorMessages';
import * as geminiService from '../utils/geminiService';

export const generateQuestions = async (req, res) => {
  try {
    const { role, skills, type, category, level, description, language } = req.body;
    if (!role || !description || !Array.isArray(skills)) {
      return res.status(400).json({ success: false, message: 'role, description va skills kiritilishi shart' });
    }
    const questions = await geminiService.generateQuestions(
      role,
      skills,
      type,
      category,
      level,
      description,
      language
    );
    res.status(200).json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getJobs = async (req, res) => {
  try {
    const { status, visibility } = req.query;
    const filter: Record<string, unknown> = { createdBy: req.user._id };
    if (status) filter.status = status;
    if (visibility) filter.visibility = visibility;

    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: jobs.map(j => jobToResponse(j)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getJobById = async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!job) {
      return res.status(404).json(createErrorResponse(req, 'JOB_NOT_FOUND', 404));
    }
    res.status(200).json({ success: true, data: jobToResponse(job) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createJob = async (req, res) => {
  try {
    let user = null;
    // Free tier tekshiruvi - HR lar uchun
    if (req.user.role === 'employer') {
      user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
      }
      
      const freeJobsUsed = user.freeJobsUsed || 0;
      const FREE_JOBS_LIMIT = 3;

      // Agar 3 tadan kam bepul ishlar ishlatilgan bo'lsa, bepul
      if (freeJobsUsed < FREE_JOBS_LIMIT) {
        user.freeJobsUsed = freeJobsUsed + 1;
        await user.save();
        // Yangilangan qiymatni tekshirish
        console.log(`[createJob] freeJobsUsed yangilandi: ${freeJobsUsed} -> ${user.freeJobsUsed}`);
      } else {
        // 3 tadan keyin suhbatlar talab qilinadi
        const userInterviews = user.interviews || 0;
        if (userInterviews < 1) {
          return res.status(402).json(createErrorResponse(req, 'JOB_INSUFFICIENT_CREDITS', 402, {
            requiresPayment: true,
            interviews: userInterviews,
            freeJobsUsed: freeJobsUsed,
            freeJobsRemaining: 0,
          }));
        }

        // 1 suhbat ishlatiladi
        user.interviews = userInterviews - 1;
        await user.save();
        console.log(`[createJob] interviews yangilandi: ${userInterviews} -> ${user.interviews}`);
      }
    }

    const body = { ...req.body, createdBy: req.user._id };
    const job = await Job.create(body);
    
    // Response'da free tier ma'lumotlarini qaytarish
    // Agar user o'zgartirilgan bo'lsa, yangilangan user'dan foydalanish
    // Aks holda, employer bo'lsa yangi olish
    if (!user && req.user.role === 'employer') {
      user = await User.findById(req.user._id);
    }
    
    // User o'zgartirilgan bo'lsa, yangilangan qiymatlarni ishlatish
    // user.save() dan keyin user o'zgaruvchisi yangilanadi, shuning uchun to'g'ridan-to'g'ri ishlatamiz
    let finalFreeJobsUsed, finalInterviews;
    if (user) {
      // User o'zgartirilgan bo'lsa, yangilangan qiymatlarni ishlatish
      finalFreeJobsUsed = user.freeJobsUsed || 0;
      finalInterviews = user.interviews || 0;
      console.log(`[createJob] Response: freeJobsUsed=${finalFreeJobsUsed}, interviews=${finalInterviews}`);
    } else {
      // User o'zgartirilmagan bo'lsa (masalan, admin yoki candidate)
      finalFreeJobsUsed = req.user.freeJobsUsed || 0;
      finalInterviews = req.user.interviews || 0;
    }
    
    res.status(201).json({ 
      success: true, 
      data: jobToResponse(job),
      freeJobsUsed: finalFreeJobsUsed,
      freeJobsRemaining: Math.max(0, 3 - finalFreeJobsUsed),
      interviews: finalInterviews,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!job) {
      return res.status(404).json(createErrorResponse(req, 'JOB_NOT_FOUND', 404));
    }
    res.status(200).json({ success: true, data: jobToResponse(job) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!job) {
      return res.status(404).json(createErrorResponse(req, 'JOB_NOT_FOUND', 404));
    }
    res.status(200).json({ success: true, message: 'Ish o\'chirildi' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Ochiq: barcha aktiv va public ishlar (saytga kirganlar uchun Jobs bo'limi)
export const getPublicJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'Active', visibility: 'PUBLIC' })
      .sort({ createdAt: -1 })
      .select('-shareToken -inviteCode')
      .lean();
    res.status(200).json({
      success: true,
      data: jobs.map(j => ({
        id: j._id?.toString(),
        title: j.title,
        department: j.department,
        role: j.role,
        description: j.description,
        experienceLevel: j.experienceLevel,
        requiredSkills: j.requiredSkills || [],
        deadline: j.deadline?.toISOString?.() || j.deadline,
        createdAt: j.createdAt?.toISOString?.() || j.createdAt,
        resumeRequired: j.resumeRequired,
        questions: j.questions || [],
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Ochiq: bitta ish (ariza formasi uchun, id bo'yicha)
export const getPublicJobById = async (req, res) => {
  try {
    const { jobId } = req.params;
    let job;
    
    // Avval ID bo'yicha qidiramiz
    if (jobId.match(/^[0-9a-fA-F]{24}$/)) {
      job = await Job.findById(jobId);
    }
    
    // Agar topilmasa yoki ID bo'lmasa, shareToken bo'yicha qidiramiz
    if (!job) {
      job = await Job.findOne({ shareToken: jobId });
    }

    if (!job) {
      return res.status(404).json(createErrorResponse(req, 'JOB_NOT_FOUND', 404));
    }

    if (job.status !== 'Active') {
      return res.status(404).json(createErrorResponse(req, 'JOB_INACTIVE', 404));
    }

    if (job.deadline && new Date(job.deadline) < new Date()) {
      return res.status(400).json({ success: false, message: 'Muddati tugagan' });
    }
    res.status(200).json({ success: true, data: jobToResponse(job) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublicJobByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const job = await Job.findOne({ shareToken: token, status: 'Active' });
    if (!job) {
      return res.status(404).json(createErrorResponse(req, 'JOB_INACTIVE', 404));
    }
    res.status(200).json({ success: true, data: jobToResponse(job) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const validateInviteCode = async (req, res) => {
  try {
    const { code } = req.body;
    const cleanCode = (code || '').trim();
    const job = await Job.findOne({
      $or: [{ inviteCode: cleanCode }, { shareToken: cleanCode }],
      status: 'Active',
    });
    if (!job) {
      return res.status(404).json(createErrorResponse(req, 'JOB_INACTIVE', 404));
    }
    if (job.deadline && new Date(job.deadline) < new Date()) {
      return res.status(400).json({ success: false, message: 'Muddati tugagan' });
    }
    res.status(200).json({ success: true, data: jobToResponse(job) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
