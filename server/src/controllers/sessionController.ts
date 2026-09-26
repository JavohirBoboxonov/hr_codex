import InterviewSession from "../models/InterviewSession";
import Application from "../models/Application";
import Job from "../models/Job";
import User from "../models/User";
import { createErrorResponse } from "../utils/errorMessages";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";
import jwt from "jsonwebtoken";
import { GoogleGenAI, Modality } from "@google/genai";
import { sessionToResponse } from "../utils/transform";
import * as geminiService from "../utils/geminiService";
import { sendTelegramMessage } from "../utils/telegram";
import * as s3Service from "../utils/s3Service";

const RECORDINGS_DIR = path.join(__dirname, "../../uploads/recordings");
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

let liveAI = null;

const getLiveAI = () => {
  if (!liveAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY .env faylida o'rnatilmagan");
    }
    liveAI = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });
  }
  return liveAI;
};

const buildLiveSystemInstruction = (job, language, recordingEnabled = false) => {
  const langNames = { en: "English", ru: "Russian", uz: "Uzbek" };
  const recordingNotice = recordingEnabled
    ? `\nRECORDING NOTICE: This interview is being recorded. At the very beginning of your greeting, briefly mention: "Just to let you know, this session is being recorded for the hiring team's review." Say this naturally, then proceed with your greeting.\n`
    : '';
  return `
CONTEXT:
You are a world-class AI Senior Recruiter conducting an adaptive interview for:
- Role: ${job?.title || "Unknown role"}
- Level: ${job?.experienceLevel || "Mid"}
- Skills: ${(job?.requiredSkills || []).join(", ")}
- Description: ${job?.description || ""}
- Language: ${langNames[language] || "Russian"}
${recordingNotice}
YOUR BEHAVIOR PROTOCOL:
1. ADAPTIVE DIFFICULTY:
   - If the candidate answers well, ask a deep, nuanced follow-up.
   - If the candidate struggles, simplify the question or provide a small hint.
2. ACTIVE LISTENING: Acknowledge specific points from the previous answer.
3. REAL WORLD SCENARIOS: Ask about production trade-offs, bug fixing, and stakeholder management.
4. EVALUATION METRICS: Monitor logical clarity, confidence, and relevance.
5. PROFESSIONAL TONE: Be warm, encouraging, but rigorous.
6. MULTILINGUAL: Strictly use ${langNames[language] || "Russian"}.

SESSION FLOW:
- Start with a professional greeting.
- Ask 1 warm-up question.
- Proceed to deep technical/scenario probing.
- If they mention a specific technology, probe their specific experience with it.

Begin now by introducing yourself and the role.
`;
};

const recordingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(RECORDINGS_DIR))
      fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
    cb(null, RECORDINGS_DIR);
  },
  filename: (req, file, cb) =>
    cb(
      null,
      `${req.params.id || "session"}-${crypto.randomBytes(12).toString("hex")}.webm`,
    ),
});
const multerUploadRecording = multer({
  storage: recordingStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "video/webm" || file.mimetype === "audio/webm")
      return cb(null, true);
    cb(new Error("Faqat WEBM recording fayllari qabul qilinadi"));
  },
}).single("recording");

const handleUploadRecordingFile = (req, res, next) => {
  multerUploadRecording(req, res, (error) => {
    if (!error) return next();
    const status = error instanceof multer.MulterError ? 400 : 415;
    return res.status(status).json({
      success: false,
      message: error.message || "Recording faylini yuklashda xatolik",
    });
  });
};

const userOwnsSession = async (session, user) => {
  if (!session || !user) return false;
  if (user.role === "admin") return true;

  const jobId = session.job?._id || session.job;
  if (user.role === "employer" && jobId) {
    const job = await Job.findOne({ _id: jobId, createdBy: user._id })
      .select("_id")
      .lean();
    return !!job;
  }

  if (user.role !== "candidate") return false;

  const applicationId = session.application?._id || session.application;
  if (!applicationId) {
    return (
      (session.candidateName || "").trim().toLowerCase() ===
      (user.fullName || "").trim().toLowerCase()
    );
  }

  const application = await Application.findOne({
    _id: applicationId,
    email: (user.email || "").trim().toLowerCase(),
  })
    .select("_id")
    .lean();
  return !!application;
};

// Optional auth - token bo'lsa user ni topadi, bo'lmasa null
const getOptionalUser = async (req) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) return null;

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "hr-lodex-secret-key-2024",
    ) as import("../types/jwt").JwtPayload;
    const user = await User.findById(decoded.id);
    return user;
  } catch (error) {
    return null;
  }
};

export const startSession = async (req, res) => {
  try {
    const { jobId, applicationId, code } = req.body;

    let job;
    if (code && (code + "").trim()) {
      const cleanCode = (code + "").trim();
      job = await Job.findOne({
        $or: [{ inviteCode: cleanCode }, { shareToken: cleanCode }],
        status: "Active",
      });
    } else if (jobId) {
      if (String(jobId).match(/^[0-9a-fA-F]{24}$/)) {
        job = await Job.findOne({ _id: jobId, status: "Active" });
      } else {
        job = await Job.findOne({ shareToken: jobId, status: "Active" });
      }
    }

    if (!job) {
      return res
        .status(404)
        .json(createErrorResponse(req, "JOB_INACTIVE", 404));
    }

    // Removed erroneous credit deduction for HR testing the interview
    const user = req.user || (await getOptionalUser(req));

    const candidateId =
      "CAND-" + crypto.randomBytes(3).toString("hex").toUpperCase();
    const candidateName =
      (req.body.candidateName && String(req.body.candidateName).trim()) || null;

    let application = null;
    if (applicationId) {
      const appQuery: Record<string, unknown> = {
        _id: applicationId,
        job: job._id,
      };
      if (user?.role === "candidate") {
        appQuery.email = (user.email || "").trim().toLowerCase();
      }
      application = await Application.findOne(appQuery);
      if (applicationId && !application && user?.role === "candidate") {
        return res
          .status(403)
          .json({
            success: false,
            message: "Bu ariza uchun intervyu boshlashga ruxsat yo'q",
          });
      }
      if (application) {
        application.status = "Interviewing";
        await application.save();
      }
    }

    if (!application && user && user.role === "candidate") {
      application = await Application.findOne({
        job: job._id,
        email: user.email.toLowerCase(),
      });
      if (!application) {
        application = await Application.create({
          job: job._id,
          name: user.fullName || candidateName || user.email,
          email: user.email.toLowerCase(),
          status: "Interviewing",
        });
      } else {
        application.status = "Interviewing";
        await application.save();
      }
    }

    const session = await InterviewSession.create({
      job: job._id,
      application: application?._id,
      candidateId,
      candidateName,
      status: "Started",
      answers: [],
      language: req.body.language || "ru",
    });

    res.status(201).json({
      success: true,
      data: sessionToResponse(session),
      interviewsRemaining:
        user && user.role === "employer" ? user.interviews : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const completeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, skipAiEvaluation } = req.body;

    const session = await InterviewSession.findById(id).populate("job");
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Sessiya topilmadi" });
    }
    if (!(await userOwnsSession(session, req.user))) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Bu sessiyani yakunlash uchun ruxsat yo'q",
        });
    }

    // Javoblar mavjud bo'lsa, AI baholash qilish
    if (answers && Array.isArray(answers)) {
      session.answers = answers;
    }
    if (
      answers &&
      Array.isArray(answers) &&
      answers.length > 0 &&
      !skipAiEvaluation
    ) {
      try {
        const formattedAnswers = answers.map((a) => ({
          questionId: a.questionId,
          questionText: a.questionText,
          answerText: a.text || a.answerText || "",
        }));

        const { evaluation, gradedAnswers } =
          await geminiService.evaluateInterview(
            (
              session.job as unknown as
                | import("../models/Job").IJobDocument
                | null
            )?.title || "Unknown Position",
            formattedAnswers,
            session.language || "ru",
          );

        session.answers = gradedAnswers;
        session.evaluation = evaluation;
      } catch (aiError) {
        console.error("AI evaluation failed:", aiError);
        session.answers = answers;
        const isQuotaError =
          aiError?.status === 429 ||
          (aiError?.message && aiError.message.includes("429"));
        session.evaluation = {
          technicalScore: 0,
          communicationScore: 0,
          problemSolvingScore: 0,
          overallScore: 0,
          overallRecommendation: "Maybe",
          summary: isQuotaError
            ? "Evaluation could not be completed: Gemini API quota exceeded (429). Please try again later or check your API plan/billing. Answers were saved — you can review the transcript below."
            : `Evaluation could not be completed: ${aiError?.message || "AI error"}. Answers were saved.`,
          strengths: [],
          weaknesses: [],
        };
      }
    } else if (!skipAiEvaluation) {
      // Javoblar bo'sh bo'lsa ham HR uchun placeholder evaluation (sessiya tugagan bo'lsin)
      session.evaluation = {
        technicalScore: 0,
        communicationScore: 0,
        problemSolvingScore: 0,
        overallScore: 0,
        overallRecommendation: "Maybe",
        summary:
          "No answers were recorded for this session. The candidate may have ended the interview before answering, or voice capture did not register.",
        strengths: [],
        weaknesses: [],
      };
    }

    session.status = "Completed";
    session.completedAt = new Date();
    await session.save();

    if (session.application) {
      await Application.findByIdAndUpdate(session.application, {
        status: "Completed",
      });
    }

    res.status(200).json({
      success: true,
      data: sessionToResponse(session),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createLiveToken = async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.id).populate(
      "job",
    );
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Sessiya topilmadi" });
    }
    if (!(await userOwnsSession(session, req.user))) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Live intervyu tokeni uchun ruxsat yo'q",
        });
    }

    const model =
      process.env.GEMINI_LIVE_MODEL || "gemini-3.1-flash-live-preview";
    const now = Date.now();
    const token = await getLiveAI().authTokens.create({
      config: {
        uses: 1,
        newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
            },
            systemInstruction: buildLiveSystemInstruction(
              session.job,
              (session.job as any)?.sourceLanguage || session.language || "ru",
              (session.job as any)?.recordingEnabled ?? false,
            ),
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        token: token.name,
        model,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSessionsByJob = async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      createdBy: req.user._id,
    });
    if (!job) {
      return res
        .status(404)
        .json(createErrorResponse(req, "JOB_NOT_FOUND", 404));
    }

    const sessions = await InterviewSession.find({ job: job._id })
      .populate("application", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: sessions.map((s) => sessionToResponse(s)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSessionById = async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.id).populate(
      "job application",
    );
    if (!session) {
      return res
        .status(404)
        .json(createErrorResponse(req, "SESSION_NOT_FOUND", 404));
    }
    res.status(200).json({
      success: true,
      data: sessionToResponse(session),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// HR uchun barcha sessiyalarni olish (barcha ishlar bo'yicha)
export const getAllSessions = async (req, res) => {
  try {
    const { status, jobId } = req.query;
    const jobs = await Job.find({ createdBy: req.user._id }).select("_id");
    const jobIds = jobs.map((j) => j._id);

    const filter: Record<string, unknown> = { job: { $in: jobIds } };
    if (status) filter.status = status;
    if (jobId) filter.job = jobId;

    const sessions = await InterviewSession.find(filter)
      .populate("job", "title department status inviteCode")
      .populate("application", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: sessions.map((s) => sessionToResponse(s)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Nomzod intervyu yozuvini yuklash (ochiq – sessiya id orqali)
export const uploadRecording = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file || !req.file.filename) {
      return res
        .status(400)
        .json({ success: false, message: "Recording fayl yuborilmadi" });
    }
    const session = await InterviewSession.findById(id);
    if (!session) {
      const p = path.join(RECORDINGS_DIR, req.file.filename);
      if (fs.existsSync(p)) fs.unlinkSync(p);
      return res
        .status(404)
        .json({ success: false, message: "Sessiya topilmadi" });
    }
    if (!(await userOwnsSession(session, req.user))) {
      const p = path.join(RECORDINGS_DIR, req.file.filename);
      if (fs.existsSync(p)) fs.unlinkSync(p);
      return res
        .status(403)
        .json({
          success: false,
          message: "Bu recordingni yuklash uchun ruxsat yo'q",
        });
    }
    if (session.recordingPath) {
      const p = path.join(RECORDINGS_DIR, req.file.filename);
      if (fs.existsSync(p)) fs.unlinkSync(p);
      return res
        .status(409)
        .json({ success: false, message: "Recording allaqachon yuklangan" });
    }
    session.recordingPath = req.file.filename;
    await session.save();
    res.status(200).json({ success: true, message: "Recording saqlandi" });
  } catch (error) {
    if (req.file && req.file.filename) {
      const p = path.join(RECORDINGS_DIR, req.file.filename);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// HR uchun sessiya yozuvini olish (himoyalangan)
export const uploadRecordingFile = handleUploadRecordingFile;

// ── S3 Multipart Upload handlers ────────────────────────────────────────────

/** POST /public/sessions/:id/recording/initiate — S3 multipart upload boshlash */
export const initiateRecording = async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.id).populate('job');
    if (!session) {
      return res.status(404).json({ success: false, message: 'Sessiya topilmadi' });
    }
    const job = session.job as any;
    if (!job?.recordingEnabled) {
      return res.status(400).json({ success: false, message: "Bu vakansiya uchun yozuv yoqilmagan" });
    }
    if (session.recordingKey) {
      return res.status(409).json({ success: false, message: 'Yozuv allaqachon mavjud' });
    }
    const { uploadId, key } = await s3Service.initiateMultipartUpload(req.params.id);
    session.s3UploadId = uploadId;
    session.recordingKey = key;
    await session.save();
    res.status(200).json({ success: true, data: { uploadId, key } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /public/sessions/:id/recording/chunk — S3 part yuklash */
export const uploadRecordingChunk = async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.id);
    if (!session || !session.s3UploadId || !session.recordingKey) {
      return res.status(400).json({ success: false, message: "Aktiv multipart upload topilmadi" });
    }
    const partNumber = parseInt(req.headers['x-part-number'] as string, 10);
    if (!partNumber || partNumber < 1 || partNumber > 10000) {
      return res.status(400).json({ success: false, message: "To'g'ri x-part-number sarlavhasi talab qilinadi (1-10000)" });
    }
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    await new Promise<void>((resolve, reject) => {
      req.on('end', resolve);
      req.on('error', reject);
    });
    const body = Buffer.concat(chunks);
    if (body.length === 0) {
      return res.status(400).json({ success: false, message: "Bo'sh chunk" });
    }
    const { ETag } = await s3Service.uploadPart(
      session.recordingKey,
      session.s3UploadId,
      partNumber,
      body,
    );
    res.status(200).json({ success: true, data: { partNumber, ETag } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /public/sessions/:id/recording/complete — S3 multipart upload yakunlash */
export const completeRecording = async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.id);
    if (!session || !session.s3UploadId || !session.recordingKey) {
      return res.status(400).json({ success: false, message: "Aktiv multipart upload topilmadi" });
    }
    const { parts } = req.body as { parts: { PartNumber: number; ETag: string }[] };
    if (!Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ success: false, message: "parts massivi talab qilinadi" });
    }
    console.log(`[completeRecording] sessionId=${req.params.id} key=${session.recordingKey} uploadId=${session.s3UploadId} parts=${JSON.stringify(parts)}`);
    await s3Service.completeMultipartUpload(session.recordingKey, session.s3UploadId, parts);
    session.s3UploadId = null;
    await session.save();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(`[completeRecording] S3 error: ${error.message}`, { name: error.name, code: error.Code ?? error.$metadata });
    res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /public/sessions/:id/recording/abort — S3 multipart upload bekor qilish */
export const abortRecording = async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Sessiya topilmadi' });
    }
    if (session.s3UploadId && session.recordingKey) {
      await s3Service.abortMultipartUpload(session.recordingKey, session.s3UploadId).catch(() => {});
      session.s3UploadId = null;
      session.recordingKey = null;
      await session.save();
    }
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

export const getRecording = async (req, res) => {
  try {
    const jobs = await Job.find({ createdBy: req.user._id }).select("_id");
    const jobIds = jobs.map((j) => j._id);
    const session = await InterviewSession.findOne({
      _id: req.params.id,
      job: { $in: jobIds },
    });
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Recording topilmadi" });
    }

    // S3 key takes priority over legacy local file
    if (session.recordingKey) {
      const url = await s3Service.getPresignedUrl(session.recordingKey, 3600);
      return res.status(200).json({ success: true, data: { url } });
    }

    if (!session.recordingPath) {
      return res
        .status(404)
        .json({ success: false, message: "Recording topilmadi" });
    }
    const filePath = path.join(RECORDINGS_DIR, session.recordingPath);
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "Fayl topilmadi" });
    }
    res.setHeader("Content-Type", "video/webm");
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// HR: kandidatning barcha suhbatlari (oldingi intervyular va natijalar)
export const getCandidateHistory = async (req, res) => {
  try {
    const { applicationId, sessionId } = req.query;
    const jobs = await Job.find({ createdBy: req.user._id }).select("_id");
    const jobIds = jobs.map((j) => j._id);

    let sessions = [];

    if (applicationId) {
      const app = await Application.findOne({
        _id: applicationId,
        job: { $in: jobIds },
      }).lean();
      if (!app) {
        return res.status(404).json(createErrorResponse(req, "NOT_FOUND", 404));
      }
      const candidateEmail = (app.email || "").trim().toLowerCase();
      const appIds = await Application.find({
        job: { $in: jobIds },
        email: new RegExp(
          `^${candidateEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i",
        ),
      })
        .select("_id")
        .lean();
      const ids = appIds.map((a) => a._id);
      sessions = await InterviewSession.find({ application: { $in: ids } })
        .populate("job", "title department")
        .populate("application", "name email")
        .sort({ completedAt: -1, createdAt: -1 })
        .lean();
    } else if (sessionId) {
      const session = await InterviewSession.findOne({
        _id: sessionId,
        job: { $in: jobIds },
      }).lean();
      if (!session) {
        return res.status(404).json(createErrorResponse(req, "NOT_FOUND", 404));
      }
      sessions = await InterviewSession.find({
        job: { $in: jobIds },
        candidateId: session.candidateId,
      })
        .populate("job", "title department")
        .populate("application", "name email")
        .sort({ completedAt: -1, createdAt: -1 })
        .lean();
    } else {
      return res.status(400).json({
        success: false,
        message: "applicationId yoki sessionId kiritilishi shart",
      });
    }

    res.status(200).json({
      success: true,
      data: sessions.map((s) => {
        const base = sessionToResponse(s);
        const job = s.job;
        return {
          ...base,
          jobTitle: job?.title,
          jobDepartment: job?.department,
        };
      }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// HR uchun sessiya to'liq ma'lumotlari (javoblar va baholash bilan)
export const getSessionDetails = async (req, res) => {
  try {
    const jobs = await Job.find({ createdBy: req.user._id }).select("_id");
    const jobIds = jobs.map((j) => j._id);

    const session = await InterviewSession.findOne({
      _id: req.params.id,
      job: { $in: jobIds },
    })
      .populate("job")
      .populate("application");

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Sessiya topilmadi" });
    }

    const jobPop = session.job as unknown as
      | import("../models/Job").IJobDocument
      | null;
    const appPop = session.application as unknown as
      | import("../models/Application").IApplicationDocument
      | null;
    const candidateName = appPop?.name ? appPop.name : session.candidateId;
    // To'liq ma'lumotlar qaytarish
    const response = {
      id: session._id.toString(),
      candidateId: session.candidateId,
      candidateName,
      status: session.status,
      language: session.language,
      startedAt: session.createdAt,
      completedAt: session.completedAt,
      job: jobPop
        ? {
            id: jobPop._id.toString(),
            title: jobPop.title,
            department: jobPop.department,
            experienceLevel: jobPop.experienceLevel,
            questions: jobPop.questions,
          }
        : null,
      application: appPop
        ? {
            id: appPop._id.toString(),
            name: appPop.name,
            email: appPop.email,
            phone: appPop.phone,
            experienceYears: appPop.experienceYears,
            resumeFileName: appPop.resumeFileName,
            analysis: appPop.analysis,
          }
        : null,
      answers: session.answers || [],
      evaluation: session.evaluation || null,
    };

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// HR uchun statistika
export const getStats = async (req, res) => {
  try {
    const jobs = await Job.find({ createdBy: req.user._id }).select("_id");
    const jobIds = jobs.map((j) => j._id);

    const totalSessions = await InterviewSession.countDocuments({
      job: { $in: jobIds },
    });
    const completedSessions = await InterviewSession.countDocuments({
      job: { $in: jobIds },
      status: "Completed",
    });

    // O'rtacha ball
    const sessions = await InterviewSession.find({
      job: { $in: jobIds },
      status: "Completed",
      "evaluation.overallScore": { $exists: true },
    }).select("evaluation.overallScore");

    const avgScore =
      sessions.length > 0
        ? sessions.reduce(
            (sum, s) => sum + (s.evaluation?.overallScore || 0),
            0,
          ) / sessions.length
        : 0;

    // Recommendation bo'yicha statistika
    const recommendations = await InterviewSession.aggregate([
      { $match: { job: { $in: jobIds }, status: "Completed" } },
      {
        $group: {
          _id: "$evaluation.overallRecommendation",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalSessions,
        completedSessions,
        pendingSessions: totalSessions - completedSessions,
        averageScore: Math.round(avgScore * 10) / 10,
        recommendations: recommendations.reduce((acc, r) => {
          if (r._id) acc[r._id] = r.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addCandidateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const session = await InterviewSession.findById(id).populate("job");
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Sessiya topilmadi" });
    }
    session.candidateFeedback = { rating, comment };
    await session.save();

    // Telegramga xabar yuborish
    const telegramMessage = `
🌟 <b>Yangi Nomzod Fikri</b>
<b>Intervyu ID:</b> <code>${session._id}</code>
<b>Vakansiya:</b> ${(session.job as unknown as import("../models/Job").IJobDocument | null)?.title || "Noma'lum"}
<b>Baho:</b> ${"⭐".repeat(rating)} (${rating}/5)
<b>Izoh:</b> ${comment || "<i>Izoh qoldirilmagan</i>"}
    `;
    await sendTelegramMessage(telegramMessage);

    res.status(200).json({ success: true, data: sessionToResponse(session) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addHrFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const session = await InterviewSession.findById(id).populate("job");
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Sessiya topilmadi" });
    }
    session.hrFeedback = { rating, comment, evaluatedBy: req.user._id };
    await session.save();

    // Telegramga xabar yuborish
    const telegramMessage = `
💼 <b>Yangi HR Bahosi</b>
<b>Intervyu ID:</b> <code>${session._id}</code>
<b>Vakansiya:</b> ${(session.job as unknown as import("../models/Job").IJobDocument | null)?.title || "Noma'lum"}
<b>HR:</b> ${req.user.fullName}
<b>Baho:</b> ${"⭐".repeat(rating)} (${rating}/5)
<b>Izoh:</b> ${comment || "<i>Izoh qoldirilmagan</i>"}
    `;
    await sendTelegramMessage(telegramMessage);

    res.status(200).json({ success: true, data: sessionToResponse(session) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
