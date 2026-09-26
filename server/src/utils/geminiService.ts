import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;
const DEFAULT_MODEL = "gemini-2.0-flash";

function getAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY .env faylida o'rnatilmagan");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

function getModelName() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

function isRetryableError(e) {
  const status = e?.status || e?.code;
  const msg = (e?.message || "").toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("high demand") ||
    msg.includes("unavailable")
  );
}

function getRetryDelayMs(e) {
  const msg = e?.message || "";
  const match = msg.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
  if (match) return Math.ceil(parseFloat(match[1]) * 1000);
  return 18000; // 18 s default
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonResponse(text, fallback) {
  try {
    return JSON.parse(text || "");
  } catch (_) {
    const cleaned = (text || "")
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch (error) {
      console.error("Gemini JSON parse error:", error.message || error);
      return fallback;
    }
  }
}

async function generateQuestions(
  role,
  skills = [],
  type = "VOICE",
  category = "TECHNICAL",
  level = "Mid",
  description = "",
  language = "ru",
) {
  const runOnce = async () => {
    const ai = getAI();
    const model = ai.getGenerativeModel({
      model: getModelName(),
      generationConfig: { responseMimeType: "application/json" },
    });
    const langNames = { en: "English", ru: "Russian", uz: "Uzbek" };
    const prompt = `You are an expert recruitment consultant. Generate 6 high-quality, job-specific interview questions for:
- Role: ${role}
- Seniority: ${level}
- Context: ${description}
- Required Skills: ${skills.join(", ")}
- Interview Type: ${type}
- Category: ${category}

Rules:
1. Ensure questions match the ${level} level.
2. At least 2 questions must be practical real scenario questions.
3. Focus on depth, not generic HR clichés.
4. Language: All text must be in ${langNames[language] || "Russian"}.
5. Return only a JSON array of objects with: id, text, category, answerType, difficulty.`;

    const result = await model.generateContent(prompt);
    const questions = parseJsonResponse(result.response.text(), []);
    return Array.isArray(questions)
      ? questions
          .map((q, index) => ({
            id: String(q.id || `q${index + 1}`),
            text: String(q.text || ""),
            category: q.category || "Technical",
            answerType: ["VOICE", "TEXT", "VIDEO"].includes(q.answerType)
              ? q.answerType
              : type,
            difficulty: q.difficulty || level,
          }))
          .filter((q) => q.text)
      : [];
  };

  const fallbackQuestions = () => {
    const langNames = { en: "English", ru: "Russian", uz: "Uzbek" };
    const prefix =
      language === "uz"
        ? "AI tizimi band. Boshlang'ich savol:"
        : language === "en"
          ? "AI service busy. Default question:"
          : "ИИ-сервис занят. Стандартный вопрос:";
    return [
      {
        id: "q1",
        text: `${prefix} 1 (${role} - ${level})`,
        category: "Technical",
        answerType: type,
        difficulty: level,
      },
      {
        id: "q2",
        text: `${prefix} 2 (${role} - ${level})`,
        category: "Technical",
        answerType: type,
        difficulty: level,
      },
      {
        id: "q3",
        text: `${prefix} 3 (${role} - ${level})`,
        category: "Career",
        answerType: type,
        difficulty: level,
      },
    ];
  };

  try {
    return await runOnce();
  } catch (error) {
    if (isRetryableError(error)) {
      console.warn(
        "Gemini API is exhausted or busy, using fallback questions...",
      );
      return fallbackQuestions();
    }
    console.error("Gemini Questions Generation error:", error.message);
    return fallbackQuestions();
  }
}

/**
 * Intervyu javoblarini AI orqali baholash
 * @param {string} jobTitle - Ish nomi
 * @param {Array} answers - Javoblar ro'yxati [{questionId, questionText, answerText}]
 * @param {string} language - Til (en, ru, uz)
 * @returns {Promise<{evaluation: Object, gradedAnswers: Array}>}
 */
async function evaluateInterview(jobTitle, answers, language = "ru") {
  const ai = getAI();
  const modelName = getModelName();
  const model = ai.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const langNames = { en: "English", ru: "Russian", uz: "Uzbek" };
  const interviewData = answers
    .map(
      (a, i) =>
        `[ID: ${a.questionId}] Question: ${a.questionText}\nAnswer: ${a.answerText || "(javob berilmagan)"}`,
    )
    .join("\n\n");

  const prompt = `You are an expert HR interviewer and strict evaluator. Analyze the following interview for a "${jobTitle}" position.

INTERVIEW DATA:
${interviewData}

TASKS:
1. Score each answer from 0 to 10 based on:
   - Relevance to the question
   - Technical accuracy (if applicable)
   - Communication clarity
   - Problem-solving demonstration
   CRITICAL RULE: If the answer is "I don't know", "bilmayman", "ne znayu", empty, or completely irrelevant, the score MUST be 0. If the answer is very short and lacks depth, the score MUST be low (1-3).

2. Provide overall evaluation scores (0-10):
   - technicalScore: Technical knowledge demonstrated
   - communicationScore: How clearly they expressed themselves
   - problemSolvingScore: Analytical thinking shown
   - overallScore: Weighted average of all factors
   Note: If the candidate answered mostly with "I don't know" or empty answers, all overall scores MUST be very low (0-2).

3. Give a hiring recommendation: "Strong Hire", "Hire", "Maybe", or "Reject". Be very critical and do not recommend candidates who fail to answer questions.

4. Write a brief summary (2-3 sentences) in ${langNames[language] || "Russian"}. Mention if the candidate struggled or failed to answer questions.

5. List 2-3 strengths and 2-3 weaknesses in ${langNames[language] || "Russian"}

IMPORTANT: In gradedAnswers, use the EXACT questionId from each "[ID: xxx]" in the interview data (e.g. q0, q1, q2).

RESPOND IN THIS EXACT JSON FORMAT:
{
  "evaluation": {
    "technicalScore": <number 1-10>,
    "communicationScore": <number 1-10>,
    "problemSolvingScore": <number 1-10>,
    "overallScore": <number 1-10>,
    "overallRecommendation": "<Strong Hire|Hire|Maybe|Reject>",
    "summary": "<brief summary>",
    "strengths": ["<strength1>", "<strength2>"],
    "weaknesses": ["<weakness1>", "<weakness2>"]
  },
  "gradedAnswers": [
    {
      "questionId": "<id>",
      "score": <number 1-10>,
      "feedback": "<brief feedback in ${langNames[language] || "Russian"}>"
    }
  ]
}`;

  const runOnce = async () => {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);
    const gradedAnswers = answers.map((a) => {
      const grade = parsed.gradedAnswers?.find(
        (g) => g.questionId === a.questionId,
      ) || {
        score: 5,
        feedback: "Baholanmadi",
      };
      return {
        questionId: a.questionId,
        questionText: a.questionText,
        text: a.answerText || "",
        score: grade.score,
        feedback: grade.feedback,
        timestamp: new Date().toISOString(),
      };
    });
    return {
      evaluation: parsed.evaluation || {
        technicalScore: 5,
        communicationScore: 5,
        problemSolvingScore: 5,
        overallScore: 5,
        overallRecommendation: "Maybe",
        summary: "Baholash amalga oshmadi",
        strengths: [],
        weaknesses: [],
      },
      gradedAnswers,
    };
  };

  const fallbackResult = () => {
    const fallbackMsg =
      language === "uz"
        ? "Sun'iy intellekt tizimi vaqtincha band bo'lganligi sababli baholashni to'liq shakllantirish imkoni bo'lmadi. Javoblar HR bo'limi tomonidan bevosita ko'rib chiqiladi."
        : language === "en"
          ? "Due to temporary unavailability of the AI service, a complete evaluation could not be generated. The answers will be directly reviewed by the HR department."
          : "В связи с временной недоступностью ИИ-сервиса полную оценку сформировать не удалось. Ответы будут рассмотрены непосредственно отделом HR.";

    const unassessed =
      language === "uz"
        ? "Baholanmadi"
        : language === "en"
          ? "Not evaluated"
          : "Не оценено";

    return {
      evaluation: {
        technicalScore: 0,
        communicationScore: 0,
        problemSolvingScore: 0,
        overallScore: 0,
        overallRecommendation: "Maybe",
        summary: fallbackMsg,
        strengths: [],
        weaknesses: [],
      },
      gradedAnswers: answers.map((a) => ({
        questionId: a.questionId,
        questionText: a.questionText,
        text: a.answerText || "",
        score: 0,
        feedback: unassessed,
        timestamp: new Date().toISOString(),
      })),
    };
  };

  try {
    return await runOnce();
  } catch (error) {
    if (isRetryableError(error)) {
      const delayMs = getRetryDelayMs(error);
      console.warn(
        `Gemini vaqtincha band yoki limitda. ${delayMs / 1000}s kutib qayta urinilmoqda...`,
      );
      await sleep(delayMs);
      try {
        return await runOnce();
      } catch (retryErr) {
        console.error(
          "Gemini evaluation (retry failed):",
          retryErr.message || retryErr,
        );
        return fallbackResult();
      }
    }
    console.error("Gemini evaluation error:", error.message || error);
    return fallbackResult();
  }
}

/**
 * Rezyumeni AI orqali tahlil qilish
 * @param {string} resumeText - Rezyume matni
 * @param {string} jobTitle - Ish nomi
 * @param {Array} requiredSkills - Talab qilinadigan ko'nikmalar
 * @returns {Promise<Object>} ResumeAnalysis
 */
async function analyzeResume(resumeText, jobTitle, requiredSkills = []) {
  const runOnce = async () => {
    const ai = getAI();
    const modelName = getModelName();
    const model = ai.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `Analyze this resume for a "${jobTitle}" position.
Required skills: ${requiredSkills.join(", ") || "Not specified"}

RESUME:
${resumeText}

Respond in JSON:
{
  "skillsScore": <0-100>,
  "experienceScore": <0-100>,
  "relevanceScore": <0-100>,
  "overallScore": <0-100>,
  "detectedSkills": ["skill1", "skill2"],
  "summary": "<brief assessment>",
  "suitabilityLabel": "<High|Medium|Low>"
}`;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  };

  try {
    return await runOnce();
  } catch (error) {
    if (isRetryableError(error)) {
      const delayMs = getRetryDelayMs(error);
      console.warn(`Gemini Resume Analysis retry in ${delayMs / 1000}s...`);
      await sleep(delayMs);
      try {
        return await runOnce();
      } catch (retryErr) {
        console.error(
          "Gemini Resume Analysis (retry failed):",
          retryErr.message,
        );
      }
    }
    console.error("Resume analysis error:", error);
    return {
      skillsScore: 0,
      experienceScore: 0,
      relevanceScore: 0,
      overallScore: 0,
      detectedSkills: [],
      summary: `Tahlil xatosi: ${error.message}`,
      suitabilityLabel: "Low",
    };
  }
}

async function analyzeResumeFile(
  fileBase64,
  mimeType,
  jobTitle,
  requiredSkills = [],
) {
  const runOnce = async () => {
    const ai = getAI();
    const model = ai.getGenerativeModel({
      model: getModelName(),
      generationConfig: { responseMimeType: "application/json" },
    });
    const result = await model.generateContent([
      {
        inlineData: {
          data: fileBase64,
          mimeType,
        },
      },
      {
        text: `Analyze the attached resume for a "${jobTitle}" position.
Required skills: ${requiredSkills.join(", ") || "Not specified"}.

Respond only in JSON:
{
  "skillsScore": <0-100>,
  "experienceScore": <0-100>,
  "relevanceScore": <0-100>,
  "overallScore": <0-100>,
  "detectedSkills": ["skill1", "skill2"],
  "summary": "<brief assessment>",
  "suitabilityLabel": "<High|Medium|Low>"
}`,
      },
    ]);
    const parsed = parseJsonResponse(result.response.text(), null);
    return parsed;
  };

  try {
    const result = await runOnce();
    return (
      result || {
        skillsScore: 0,
        experienceScore: 0,
        relevanceScore: 0,
        overallScore: 0,
        detectedSkills: [],
        summary: "Resume analysis could not be completed.",
        suitabilityLabel: "Low",
      }
    );
  } catch (error) {
    if (isRetryableError(error)) {
      const delayMs = getRetryDelayMs(error);
      console.warn(
        `Gemini Resume File Analysis retry in ${delayMs / 1000}s...`,
      );
      await sleep(delayMs);
      try {
        return await runOnce();
      } catch (retryErr) {
        console.error(
          "Gemini Resume File Analysis (retry failed):",
          retryErr.message,
        );
      }
    }
    return {
      skillsScore: 0,
      experienceScore: 0,
      relevanceScore: 0,
      overallScore: 0,
      detectedSkills: [],
      summary: "Resume analysis could not be completed due to service error.",
      suitabilityLabel: "Low",
    };
  }
}

export {
  generateQuestions,
  evaluateInterview,
  analyzeResume,
  analyzeResumeFile,
};
