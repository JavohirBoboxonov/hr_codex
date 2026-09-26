import { requestAuth } from "./authService";
import type { Job, Question, Language } from "../types";

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
  questions: Array<{ id: string; text: string; category: string; answerType: string; difficulty: string }>;
  status: string;
  shareToken?: string;
  inviteCode?: string;
  createdAt: string;
  deadline?: string;
}

function mapApiJobToJob(api: ApiJob): Job {
  return {
    id: api.id,
    title: api.title,
    department: api.department,
    role: api.role,
    description: api.description,
    experienceLevel: api.experienceLevel as Job["experienceLevel"],
    requiredSkills: api.requiredSkills ?? [],
    interviewType: api.interviewType as Job["interviewType"],
    interviewCategory: api.interviewCategory as Job["interviewCategory"],
    interviewMode: api.interviewMode as Job["interviewMode"],
    visibility: api.visibility as Job["visibility"],
    sourceLanguage: api.sourceLanguage as Job["sourceLanguage"],
    resumeRequired: api.resumeRequired ?? true,
    questions: (api.questions ?? []).map((q) => ({
      id: q.id,
      text: q.text,
      category: q.category as Question["category"],
      answerType: q.answerType as Question["answerType"],
      difficulty: q.difficulty as Question["difficulty"],
    })),
    status: api.status as Job["status"],
    shareToken: api.shareToken,
    inviteCode: api.inviteCode,
    createdAt: api.createdAt,
    deadline: api.deadline,
  };
}

export async function getJobs(params?: { status?: string; visibility?: string }): Promise<Job[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.visibility) q.set("visibility", params.visibility);
  const query = q.toString();
  const res = await requestAuth<ApiJob[]>(`/jobs${query ? `?${query}` : ""}`);
  return (res.data ?? []).map(mapApiJobToJob);
}

export async function getJob(id: string): Promise<Job | null> {
  const res = await requestAuth<ApiJob>(`/jobs/${id}`);
  return res.data ? mapApiJobToJob(res.data) : null;
}

export interface CreateJobPayload {
  title: string;
  department?: string;
  role: string;
  description: string;
  experienceLevel?: string;
  requiredSkills?: string[];
  interviewType?: string;
  interviewCategory?: string;
  interviewMode?: string;
  visibility?: string;
  sourceLanguage?: string;
  resumeRequired?: boolean;
  recordingEnabled?: boolean;
  questions?: Array<{ id: string; text: string; category: string; answerType: string; difficulty: string }>;
  deadline?: string;
  status?: string;
}

export async function createJob(payload: CreateJobPayload): Promise<Job & { freeJobsUsed?: number; freeJobsRemaining?: number; interviews?: number }> {
  const res = await requestAuth<ApiJob>("/jobs", { method: "POST", body: payload as object });
  if (!res.data) throw new Error("No job returned");
  const job = mapApiJobToJob(res.data);
  // Backend'dan kelgan qo'shimcha ma'lumotlarni qaytarish (response'ning to'g'ridan-to'g'ri property'lari)
  const fullResponse = res as any;
  return {
    ...job,
    freeJobsUsed: fullResponse.freeJobsUsed,
    freeJobsRemaining: fullResponse.freeJobsRemaining,
    interviews: fullResponse.interviews,
  };
}

export async function updateJob(id: string, payload: Partial<CreateJobPayload>): Promise<Job> {
  const res = await requestAuth<ApiJob>(`/jobs/${id}`, { method: "PATCH", body: payload as object });
  if (!res.data) throw new Error("No job returned");
  return mapApiJobToJob(res.data);
}

export async function deleteJob(id: string): Promise<void> {
  await requestAuth(`/jobs/${id}`, { method: "DELETE" });
}
