import { API_BASE, getToken, request, requestAuth } from "./authService";
import type { Job, Question, CandidateApplication, InterviewSession, Answer, Evaluation, ResumeAnalysis } from "../types";

const PUBLIC_PREFIX = "/public";

async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 3, baseDelay = 300): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      if (attempt === maxRetries || !(err instanceof TypeError)) throw err;
      await new Promise(res => setTimeout(res, baseDelay * Math.pow(2, attempt)));
    }
  }
  throw new Error('Unreachable');
}

export interface ApiJob {
  id: string;
  title: string;
  department: string;
  role: string;
  description: string;
  experienceLevel: string;
  requiredSkills: string[];
  interviewType: string;
  interviewCategory: string;
  interviewMode: string;
  visibility: string;
  sourceLanguage: string;
  resumeRequired: boolean;
  recordingEnabled?: boolean;
  questions: Array<{ id: string; text: string; category: string; answerType: string; difficulty: string }>;
  status: string;
  shareToken?: string;
  inviteCode?: string;
  createdAt: string;
  deadline?: string;
}

function mapApiJobToJob(api: Partial<ApiJob> & Pick<ApiJob, "id" | "title" | "department" | "role" | "description">): Job {
  return {
    id: api.id,
    title: api.title,
    department: api.department,
    role: api.role,
    description: api.description,
    experienceLevel: (api.experienceLevel ?? "Mid") as Job["experienceLevel"],
    requiredSkills: api.requiredSkills ?? [],
    interviewType: (api.interviewType ?? "TEXT") as Job["interviewType"],
    interviewCategory: (api.interviewCategory ?? "TECHNICAL") as Job["interviewCategory"],
    interviewMode: (api.interviewMode ?? "INSTANT") as Job["interviewMode"],
    visibility: (api.visibility ?? "PUBLIC") as Job["visibility"],
    sourceLanguage: (api.sourceLanguage ?? "uz") as Job["sourceLanguage"],
    resumeRequired: api.resumeRequired ?? true,
    recordingEnabled: api.recordingEnabled ?? false,
    questions: (api.questions ?? []).map((q) => ({
      id: q.id,
      text: q.text,
      category: q.category as Question["category"],
      answerType: q.answerType as Question["answerType"],
      difficulty: q.difficulty as Question["difficulty"],
    })),
    status: (api.status ?? "Active") as Job["status"],
    shareToken: api.shareToken,
    inviteCode: api.inviteCode,
    createdAt: api.createdAt ?? new Date().toISOString(),
    deadline: api.deadline,
  };
}

export async function getPublicJobs(): Promise<Job[]> {
  const res = await request<ApiJob[]>(`${PUBLIC_PREFIX}/jobs`);
  return (res.data ?? []).map(mapApiJobToJob);
}

export async function getJobByToken(token: string): Promise<Job | null> {
  const res = await request<ApiJob>(`${PUBLIC_PREFIX}/jobs/token/${encodeURIComponent(token)}`);
  return res.data ? mapApiJobToJob(res.data) : null;
}

/** GET /api/public/jobs/:jobId – ariza sahifasi uchun ish ma’lumoti */
export async function getJobById(jobId: string, code?: string): Promise<Job | null> {
  const query = code ? `?code=${encodeURIComponent(code)}` : "";
  const res = await request<ApiJob>(`${PUBLIC_PREFIX}/jobs/${jobId}${query}`);
  return res.data ? mapApiJobToJob(res.data) : null;
}

export async function validateInvite(code: string): Promise<Job | null> {
  const res = await request<ApiJob>(`${PUBLIC_PREFIX}/validate-invite`, {
    method: "POST",
    body: { code },
  });
  return res.data ? mapApiJobToJob(res.data) : null;
}

export interface ApplyPayload {
  name: string;
  email: string;
  phone?: string;
  experienceYears?: number;
  resumeFileName?: string;
  resumeMimeType?: string;
  resumeBase64?: string;
  analysis?: CandidateApplication["analysis"];
}

export async function applyToJob(
  jobId: string,
  payload: ApplyPayload,
  code?: string
): Promise<CandidateApplication> {
  const query = code ? `?code=${encodeURIComponent(code)}` : "";
  const res = await requestAuth<CandidateApplication>(`${PUBLIC_PREFIX}/jobs/${jobId}/apply${query}`, {
    method: "POST",
    body: payload as object,
  });
  if (!res.data) throw new Error("No application returned");
  return res.data as CandidateApplication;
}

export interface StartSessionPayload {
  jobId?: string;
  code?: string;
  applicationId?: string;
  language?: string;
  /** Tizimga kirgan nomzodning ism-familiyasi (invite sessiyada ko‘rsatish uchun) */
  candidateName?: string;
}

export interface ApiSession {
  id: string;
  jobId: string;
  applicationId?: string;
  candidateId: string;
  candidateName?: string;
  status: string;
  answers: Answer[];
  startedAt: string;
  language?: string;
}

function mapApiSessionToSession(api: ApiSession): InterviewSession {
  return {
    id: api.id,
    jobId: api.jobId,
    applicationId: api.applicationId,
    candidateId: api.candidateId,
    candidateName: api.candidateName,
    status: api.status as InterviewSession["status"],
    answers: api.answers ?? [],
    startedAt: api.startedAt,
    language: api.language as InterviewSession["language"],
  };
}

export async function startSession(payload: StartSessionPayload): Promise<InterviewSession> {
  // Language ni payload dan yoki localStorage dan olish
  const language = payload.language || (() => {
    const saved = localStorage.getItem('language');
    return saved === 'ru' || saved === 'en' || saved === 'uz' ? saved : 'uz';
  })();
  
  const res = await requestAuth<ApiSession>(`${PUBLIC_PREFIX}/sessions/start`, {
    method: "POST",
    body: { ...payload, language } as object,
    language: language as any,
  });
  
  // Interviews yetarli bo'lmaganda xatolik
  if (!res.success && (res as any).requiresPayment) {
    const error = new Error((res as any).message || "Interviews yetarli emas");
    (error as any).requiresPayment = true;
    (error as any).interviews = (res as any).interviews;
    (error as any).errorCode = (res as any).errorCode;
    throw error;
  }
  
  if (!res.data) throw new Error("No session returned");
  return mapApiSessionToSession(res.data);
}

/** Hujjat: answers + skipAiEvaluation. Backend AI baholash qiladi va response da evaluation qaytaradi. */
export interface CompleteSessionPayload {
  answers: Array<{ questionId: string; questionText: string; text: string }>;
  skipAiEvaluation?: boolean;
}

export interface CompleteSessionResponse {
  id: string;
  jobId: string;
  candidateId: string;
  status: string;
  answers: Answer[];
  evaluation?: Evaluation;
  completedAt?: string;
}

export async function completeSession(
  sessionId: string,
  payload: CompleteSessionPayload
): Promise<InterviewSession> {
  const res = await requestAuth<CompleteSessionResponse>(`${PUBLIC_PREFIX}/sessions/${sessionId}/complete`, {
    method: "PATCH",
    body: payload as object,
  });
  if (!res.data) throw new Error("No session returned");
  const d = res.data;
  return {
    id: d.id,
    jobId: d.jobId,
    candidateId: d.candidateId,
    status: d.status as InterviewSession["status"],
    answers: d.answers ?? [],
    evaluation: d.evaluation,
    startedAt: "",
    completedAt: d.completedAt,
    hasRecording: (d as { hasRecording?: boolean }).hasRecording,
  };
}

/** S3 multipart yozuv: initiate */
export async function initiateRecording(sessionId: string): Promise<{ uploadId: string; key: string }> {
  const res = await requestAuth<{ uploadId: string; key: string }>(`${PUBLIC_PREFIX}/sessions/${sessionId}/recording/initiate`, {
    method: 'POST',
    body: {},
  });
  if (!res.data) throw new Error('Recording initiate failed');
  return res.data;
}

/** S3 multipart yozuv: chunk yuklash */
export async function uploadRecordingChunk(sessionId: string, partNumber: number, buffer: ArrayBuffer): Promise<{ ETag: string }> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const resp = await fetchWithRetry(`${API_BASE}/public/sessions/${sessionId}/recording/chunk`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'x-part-number': String(partNumber),
    },
    body: buffer,
  });
  const json = await resp.json().catch(() => ({})) as { success?: boolean; data?: { ETag?: string }; message?: string };
  if (!resp.ok || !json.data?.ETag) throw new Error(json.message ?? `Chunk upload failed: ${resp.status}`);
  return { ETag: json.data.ETag };
}

/** S3 multipart yozuv: complete */
export async function completeRecording(sessionId: string, parts: { PartNumber: number; ETag: string }[]): Promise<void> {
  const res = await requestAuth(`${PUBLIC_PREFIX}/sessions/${sessionId}/recording/complete`, {
    method: 'POST',
    body: { parts } as object,
  });
  if (!res.success) throw new Error((res as any).message ?? 'Recording complete failed');
}

/** S3 multipart yozuv: abort */
export async function abortRecording(sessionId: string): Promise<void> {
  await requestAuth(`${PUBLIC_PREFIX}/sessions/${sessionId}/recording/abort`, {
    method: 'POST',
    body: {},
  }).catch(() => {});
}

/** Nomzod: intervyu yozuvini (video/audio) yuklash – LEGACY ochiq endpoint */
export async function uploadSessionRecording(sessionId: string, blob: Blob): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const form = new FormData();
  form.append("recording", blob, "recording.webm");
  const res = await fetchWithRetry(`${API_BASE}/public/sessions/${sessionId}/recording`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { message?: string }).message ?? `Upload failed: ${res.status}`);
}

export async function createLiveToken(sessionId: string): Promise<{ token: string; model: string }> {
  const res = await requestAuth<{ token: string; model: string }>(`${PUBLIC_PREFIX}/sessions/${sessionId}/live-token`, {
    method: "POST",
  });
  if (!res.data?.token || !res.data?.model) throw new Error("No live token returned");
  return res.data;
}

export async function analyzeResume(
  fileBase64: string,
  mimeType: string,
  jobTitle: string,
  requiredSkills: string[]
): Promise<ResumeAnalysis> {
  const res = await requestAuth<ResumeAnalysis>(`${PUBLIC_PREFIX}/resume/analyze`, {
    method: "POST",
    body: { fileBase64, mimeType, jobTitle, requiredSkills },
  });
  if (!res.data) throw new Error("No resume analysis returned");
  return res.data;
}

export async function addCandidateFeedback(sessionId: string, rating: number, comment: string): Promise<InterviewSession> {
  const res = await requestAuth<CompleteSessionResponse>(`${PUBLIC_PREFIX}/sessions/${sessionId}/candidate-feedback`, {
    method: "POST",
    body: { rating, comment },
  });
  if (!res.data) throw new Error("No session returned");
  const d = res.data;
  return {
    id: d.id,
    jobId: d.jobId,
    candidateId: d.candidateId,
    status: d.status as InterviewSession["status"],
    answers: d.answers ?? [],
    evaluation: d.evaluation,
    startedAt: "",
    completedAt: d.completedAt,
    hasRecording: (d as { hasRecording?: boolean }).hasRecording,
  };
}
