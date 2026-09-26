import { requestAuth } from "./authService";
import type { CandidateApplication, ResumeAnalysis } from "../types";

export interface ApiApplication {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone?: string;
  experienceYears?: number;
  resumeFileName?: string;
  resumeMimeType?: string;
  resumeBase64?: string;
  analysis?: ResumeAnalysis;
  appliedAt: string;
  status: string;
}

function mapApiApplicationToApp(api: ApiApplication): CandidateApplication {
  return {
    id: api.id,
    jobId: api.jobId,
    name: api.name,
    email: api.email,
    phone: api.phone ?? "",
    experienceYears: api.experienceYears ?? 0,
    resumeFileName: api.resumeFileName ?? "",
    resumeMimeType: api.resumeMimeType ?? "",
    resumeBase64: api.resumeBase64 ?? "",
    analysis: api.analysis,
    appliedAt: api.appliedAt,
    status: api.status as CandidateApplication["status"],
  };
}

export async function getApplications(): Promise<CandidateApplication[]> {
  const res = await requestAuth<ApiApplication[]>("/applications");
  return (res.data ?? []).map(mapApiApplicationToApp);
}

export interface MyApplicationItem {
  application: CandidateApplication;
  job: { id: string; title: string; department: string; role: string; status: string; experienceLevel?: string } | null;
  session: {
    id: string;
    jobId: string;
    applicationId: string | null;
    status: string;
    answers: Array<{ questionText: string; text: string; score?: number; feedback?: string }>;
    evaluation?: {
      technicalScore?: number;
      communicationScore?: number;
      problemSolvingScore?: number;
      overallScore?: number;
      overallRecommendation?: string;
      summary?: string;
      strengths?: string[];
      weaknesses?: string[];
    };
    startedAt: string;
    completedAt?: string;
    hasRecording?: boolean;
  } | null;
}

export async function getMyApplications(): Promise<MyApplicationItem[]> {
  const res = await requestAuth<MyApplicationItem[]>("/applications/my");
  if (!res.success || !res.data) return [];
  return (res.data as MyApplicationItem[]).map(item => ({
    application: mapApiApplicationToApp(item.application as ApiApplication),
    job: item.job,
    session: item.session,
  }));
}

export async function getApplicationsByJob(jobId: string): Promise<CandidateApplication[]> {
  const res = await requestAuth<ApiApplication[]>(`/applications/job/${jobId}`);
  return (res.data ?? []).map(mapApiApplicationToApp);
}

export type ApplicationStatus = "Applied" | "Screened" | "Interviewing" | "Completed" | "Rejected";

export async function updateApplicationStatus(id: string, status: ApplicationStatus): Promise<void> {
  await requestAuth(`/applications/${id}/status`, { method: "PATCH", body: { status } });
}

export async function getApplicationById(id: string): Promise<CandidateApplication> {
  const res = await requestAuth<ApiApplication>(`/applications/${id}`);
  if (!res.data) throw new Error("Application not found");
  return mapApiApplicationToApp(res.data);
}
