
export enum UserRole {
  HR = 'HR',
  CANDIDATE = 'CANDIDATE',
  ADMIN = 'ADMIN'
}

export enum InterviewType {
  TEXT = 'TEXT',
  VIDEO = 'VIDEO',
  VOICE = 'VOICE'
}

export enum InterviewCategory {
  TECHNICAL = 'TECHNICAL',
  CAREER = 'CAREER',
  ACADEMIC = 'ACADEMIC'
}

export enum InterviewMode {
  ASYNC = 'ASYNC',
  SCHEDULED = 'SCHEDULED',
  INSTANT = 'INSTANT'
}

export enum JobVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE'
}

export enum Language {
  EN = 'en',
  RU = 'ru',
  UZ = 'uz'
}

export type JobStatus = 'Active' | 'Paused' | 'Archived' | 'Closed';
export type ExperienceLevel = 'Junior' | 'Mid' | 'Senior' | 'Lead';

// Kandidat profilida: o'qigan joy
export interface EducationEntry {
  _id?: string;
  institution: string;
  degree: string;
  field: string;
  startYear: number | null;
  endYear: number | null;
  description: string;
}

// Kandidat profilida: ish tajribasi
export interface WorkExperienceEntry {
  _id?: string;
  company: string;
  position: string;
  startYear: number | null;
  startMonth: number | null;
  endYear: number | null;
  endMonth: number | null;
  current: boolean;
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
  interviews?: number;
  freeJobsUsed?: number;
  // Profil (backend /profile/me dan keladi)
  avatar?: string | null;
  dateOfBirth?: string | null;
  address?: string;
  gender?: string;
  education?: EducationEntry[];
  workExperience?: WorkExperienceEntry[];
}

export interface Question {
  id: string;
  text: string;
  category: 'Technical' | 'Problem Solving' | 'Experience' | 'Soft Skills';
  answerType: InterviewType;
  difficulty: ExperienceLevel;
}

export interface Answer {
  questionId: string;
  questionText: string;
  text: string;
  score?: number; // 1-10
  feedback?: string;
  timestamp: string;
  isFollowUp?: boolean;
}

export interface ResumeAnalysis {
  skillsScore: number;
  experienceScore: number;
  relevanceScore: number;
  overallScore: number;
  detectedSkills: string[];
  summary: string;
  suitabilityLabel: 'High' | 'Medium' | 'Low';
}

export interface ChatMessage {
  id: string;
  applicationId: string;
  text: string;
  senderName: string;
  timestamp: string;
  isRead: boolean;
}

export interface CandidateApplication {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone: string;
  experienceYears: number;
  resumeFileName: string;
  resumeMimeType: string;
  resumeBase64: string; // The raw file data for AI and HR review
  analysis?: ResumeAnalysis;
  appliedAt: string;
  status: 'Applied' | 'Screened' | 'Interviewing' | 'Completed' | 'Rejected';
}

export interface Evaluation {
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  overallScore: number;
  overallRecommendation: 'Strong Hire' | 'Hire' | 'Maybe' | 'Reject';
  summary: string;
  strengths: string[];
  weaknesses: string[];
}

export interface Job {
  id: string;
  title: string;
  department: string;
  role: string;
  description: string;
  experienceLevel: ExperienceLevel;
  requiredSkills: string[];
  interviewType: InterviewType;
  interviewCategory: InterviewCategory;
  interviewMode: InterviewMode;
  visibility: JobVisibility;
  questions: Question[];
  sourceLanguage: Language;
  resumeRequired: boolean;
  recordingEnabled?: boolean;
  deadline?: string;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  status: JobStatus;
  shareToken?: string;
  inviteCode?: string;
}

export interface InterviewSession {
  id: string;
  jobId: string;
  candidateId: string;
  /** Ism-familiya (ariza bo'yicha) yoki candidateId agar ariza yo'q bo'lsa */
  candidateName?: string;
  applicationId?: string; // Links to the initial CandidateApplication
  status: 'Not Started' | 'Started' | 'In Progress' | 'Completed' | 'Terminated';
  answers: Answer[];
  evaluation?: Evaluation;
  startedAt: string;
  completedAt?: string;
  language?: Language;
  /** Intervyu video/audio yozuvi mavjudligi */
  hasRecording?: boolean;
  /** HR kandidat tarixi: vakansiya nomi (backend candidate-history dan) */
  jobTitle?: string;
  jobDepartment?: string;
  candidateFeedback?: {
    rating: number;
    comment: string;
  };
  hrFeedback?: {
    rating: number;
    comment: string;
    evaluatedBy?: string;
  };
}

export interface Tariff {
  id: string;
  name: string;
  description: string;
  price: number;
  interviews: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PaymentStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface Payment {
  id: string;
  userId: string;
  tariffId: string;
  amount: number;
  interviews: number;
  status: PaymentStatus;
  receiptPath?: string;
  receiptFileName?: string;
  adminNote?: string;
  approvedBy?: {
    id: string;
    name: string;
  };
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  tariff?: {
    name: string;
    price: number;
    interviews: number;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    telegramId?: string;
  };
}
