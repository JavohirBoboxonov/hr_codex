import { requestAuth } from './authService';
import type { User, EducationEntry, WorkExperienceEntry } from '../types';

export interface ProfileResponse {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    interviews: number;
    freeJobsUsed: number;
    avatar: string | null;
    dateOfBirth: string | null;
    address: string;
    gender: string;
    education: EducationEntry[];
    workExperience: WorkExperienceEntry[];
  };
}

export async function getProfile(): Promise<ProfileResponse> {
  const res = await requestAuth<ProfileResponse>('/profile/me');
  if (!res.success || !res.data) throw new Error(res.message || 'Profil yuklanmadi');
  return res.data as ProfileResponse;
}

export interface UpdateProfilePayload {
  fullName?: string;
  avatar?: string | null;
  dateOfBirth?: string | null;
  address?: string;
  gender?: string;
  education?: EducationEntry[];
  workExperience?: WorkExperienceEntry[];
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileResponse> {
  const res = await requestAuth<ProfileResponse>('/profile/me', {
    method: 'PATCH',
    body: payload,
  });
  if (!res.success || !res.data) throw new Error(res.message || 'Profil yangilanmadi');
  return res.data as ProfileResponse;
}

/** HR uchun: email orqali candidate profilini olish */
export async function getCandidateProfileByEmail(email: string): Promise<ProfileResponse> {
  const res = await requestAuth<ProfileResponse>(`/profile/candidate?email=${encodeURIComponent(email)}`);
  if (!res.success || !res.data) throw new Error(res.message || 'Candidate profil yuklanmadi');
  return res.data as ProfileResponse;
}

/** Backend profile user -> frontend User */
export function profileToUser(p: ProfileResponse['user']): User {
  return {
    id: p.id,
    name: p.fullName,
    email: p.email,
    role: p.role as User['role'],
    interviews: p.interviews,
    freeJobsUsed: p.freeJobsUsed,
    avatar: p.avatar,
    dateOfBirth: p.dateOfBirth,
    address: p.address,
    gender: p.gender,
    education: p.education,
    workExperience: p.workExperience,
  };
}
