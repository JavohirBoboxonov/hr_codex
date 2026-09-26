import Application from '../models/Application';
import Job from '../models/Job';
import InterviewSession from '../models/InterviewSession';
import { applicationToResponse, jobToResponse, sessionToResponse } from '../utils/transform';
import { createErrorResponse } from '../utils/errorMessages';
import * as geminiService from '../utils/geminiService';

export const analyzeResume = async (req, res) => {
  try {
    const { fileBase64, mimeType, jobTitle, requiredSkills } = req.body;
    if (!fileBase64 || !mimeType || !jobTitle) {
      return res.status(400).json({ success: false, message: 'Resume fayli va vakansiya nomi kiritilishi shart' });
    }
    const analysis = await geminiService.analyzeResumeFile(
      fileBase64,
      mimeType,
      jobTitle,
      Array.isArray(requiredSkills) ? requiredSkills : []
    );
    res.status(200).json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Kandidat: o'z arizalari ro'yxati (email orqali), har biri uchun job + session (evaluation) */
export const getMyApplications = async (req, res) => {
  try {
    const email = (req.user.email || '').toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email topilmadi' });
    }
    const applications = await Application.find({ email })
      .populate('job', 'title department role status experienceLevel inviteCode shareToken')
      .sort({ createdAt: -1 })
      .lean();

    const sessionByAppId = {};
    if (applications.length) {
      const appIds = applications.map(a => a._id);
      const sessions = await InterviewSession.find({ application: { $in: appIds } }).lean();
      sessions.forEach(s => {
        const aid = (s.application && typeof s.application === 'object' && s.application._id ? s.application._id : s.application)?.toString?.() || (s.application && String(s.application));
        if (aid) sessionByAppId[aid] = s;
      });
    }

    const data = applications.map(a => {
      const job = a.job;
      const session = sessionByAppId[a._id.toString()] || null;
      return {
        application: applicationToResponse(a),
        job: job ? jobToResponse(job) : null,
        session: session ? sessionToResponse({ ...session, job: job?._id || session.job, application: { name: a.name } }) : null,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getApplicationsByJob = async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      createdBy: req.user._id,
    });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Ish topilmadi' });
    }
    const applications = await Application.find({ job: job._id })
      .sort({ createdAt: -1 })
      .select('-resumeBase64')
      .lean();
    res.status(200).json({
      success: true,
      data: applications.map(a => applicationToResponse({ ...a, job: job._id })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllApplications = async (req, res) => {
  try {
    const jobs = await Job.find({ createdBy: req.user._id }).select('_id');
    const jobIds = jobs.map(j => j._id);
    const applications = await Application.find({ job: { $in: jobIds } })
      .populate('job', 'title department status inviteCode shareToken')
      .sort({ createdAt: -1 })
      .select('-resumeBase64') // List viewda base64 ni olib tashlaymiz
      .lean();
    res.status(200).json({
      success: true,
      data: applications.map(a => applicationToResponse(a)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const applyToJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { code } = req.query;
    const cleanCode = (code || '').trim();
    let job;

    if (cleanCode) {
      const query: Record<string, unknown> = {
        $or: [{ inviteCode: cleanCode }, { shareToken: cleanCode }],
        status: 'Active',
      };
      if (jobId && jobId.match(/^[0-9a-fA-F]{24}$/)) query._id = jobId;
      job = await Job.findOne(query);
    } else {
      if (jobId && jobId.match(/^[0-9a-fA-F]{24}$/)) {
        job = await Job.findOne({ _id: jobId, status: 'Active' });
      } else {
        job = await Job.findOne({ shareToken: jobId, status: 'Active' });
      }
    }

    if (!job) {
      return res.status(404).json(createErrorResponse(req, 'APP_JOB_NOT_FOUND', 404));
    }
    const { name, phone, experienceYears, resumeFileName, resumeMimeType, resumeBase64 } = req.body;
    const userEmail = (req.user.email || '').trim().toLowerCase();
    const candidateName = (req.user.fullName || name || '').trim();
    if (!candidateName || !userEmail) {
      return res.status(400).json(createErrorResponse(req, 'APP_NAME_EMAIL_REQUIRED', 400));
    }
    if (job.resumeRequired && !resumeBase64) {
      return res.status(400).json(createErrorResponse(req, 'APP_RESUME_REQUIRED', 400));
    }

    const existing = await Application.findOne({ job: job._id, email: userEmail });
    if (existing) {
      return res.status(400).json(createErrorResponse(req, 'APP_ALREADY_APPLIED', 400));
    }

    let analysis = null;
    if (resumeBase64 && resumeMimeType) {
      try {
        analysis = await geminiService.analyzeResumeFile(
          resumeBase64,
          resumeMimeType,
          job.title,
          job.requiredSkills || []
        );
      } catch (analysisError) {
        console.error('Resume analysis failed:', analysisError.message || analysisError);
      }
    }

    const application = await Application.create({
      job: job._id,
      name: candidateName,
      email: userEmail,
      phone: phone || '',
      experienceYears: experienceYears || 0,
      resumeFileName: resumeFileName || '',
      resumeMimeType: resumeMimeType || '',
      resumeBase64: resumeBase64 || '',
      analysis,
      status: analysis ? 'Screened' : 'Applied',
    });

    res.status(201).json({
      success: true,
      message: 'Ariza muvaffaqiyatli yuborildi',
      data: applicationToResponse(application),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const hrJobIds = await Job.find({ createdBy: req.user._id }).select('_id').lean();
    const ids = hrJobIds.map(j => j._id);

    const application = await Application.findOne({
      _id: req.params.id,
      job: { $in: ids },
    });
    if (!application) {
      return res.status(404).json(createErrorResponse(req, 'APP_NOT_FOUND', 404));
    }

    const { status } = req.body;
    if (!['Applied', 'Screened', 'Interviewing', 'Completed', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Noto\'g\'ri status' });
    }

    application.status = status;
    await application.save();

    res.status(200).json({ success: true, data: applicationToResponse(application) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getApplicationById = async (req, res) => {
  try {
    const hrJobIds = await Job.find({ createdBy: req.user._id }).select('_id').lean();
    const ids = hrJobIds.map(j => j._id);

    const application = await Application.findOne({
      _id: req.params.id,
      job: { $in: ids },
    }).populate('job').lean();

    if (!application) {
      return res.status(404).json(createErrorResponse(req, 'APP_NOT_FOUND', 404));
    }

    res.status(200).json({ success: true, data: applicationToResponse(application) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
