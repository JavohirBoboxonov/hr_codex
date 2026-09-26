import { requestAuth } from './authService';

export interface PartnerStatsResponse {
  isPartner: boolean;
  referralCode?: string;
  referralsCount: number;
  totalSpent: number;
  totalEarnings: number;
  referrals: {
    fullName: string;
    email: string;
    isEmailVerified?: boolean;
    createdAt: string;
    amountSpent: number;
  }[];
}

export async function activatePartner(): Promise<{ referralCode: string }> {
  const res = await requestAuth<{ referralCode: string }>('/partner/activate', {
    method: 'POST',
  });
  if (!res.success || !res.data) throw new Error(res.message || 'Hamkorlikni faollashtirib bo\'lmadi');
  return res.data;
}

export async function getPartnerStats(): Promise<PartnerStatsResponse> {
  const res = await requestAuth<PartnerStatsResponse>('/partner/stats');
  if (!res.success || !res.data) throw new Error(res.message || 'Hamkorlik statistikasini yuklab bo\'lmadi');
  return res.data;
}
