import { request, requestAuth, API_BASE } from "./authService";
import type { Payment } from "../types";

export async function getMyPayments(): Promise<Payment[]> {
  const res = await requestAuth<Payment[]>("/payments/my-payments");
  return res.data || [];
}

export async function getAllPayments(status?: string): Promise<Payment[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await requestAuth<Payment[]>(`/payments${query}`);
  return res.data || [];
}

export interface CreatePaymentPayload {
  tariffId: string;
  amount: number;
  telegramMessageId?: number;
  telegramChatId?: number;
}

export async function createPayment(payload: CreatePaymentPayload, receiptFile: File, language?: string): Promise<Payment> {
  const { API_BASE: base } = await import("./authService");
  const token = localStorage.getItem("hrlodex_token");

  // Til kodini olish
  const langHeader = language || (() => {
    const saved = localStorage.getItem('language');
    return saved === 'ru' || saved === 'en' || saved === 'uz' ? saved : 'uz';
  })();

  const formData = new FormData();
  formData.append("receipt", receiptFile);
  formData.append("tariffId", payload.tariffId);
  formData.append("amount", payload.amount.toString());
  if (payload.telegramMessageId) {
    formData.append("telegramMessageId", payload.telegramMessageId.toString());
  }
  if (payload.telegramChatId) {
    formData.append("telegramChatId", payload.telegramChatId.toString());
  }

  const res = await fetch(`${base}/payments/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Accept-Language": langHeader,
    },
    body: formData,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Backend'dan kelgan errorCode va message ni qaytarish
    const error = new Error(json.message ?? `HTTP ${res.status}`);
    (error as any).errorCode = json.errorCode;
    (error as any).response = json;
    throw error;
  }

  if (!json.data) throw new Error("No payment returned");
  return json.data as Payment;
}

export async function approvePayment(id: string, adminNote?: string): Promise<Payment> {
  const res = await requestAuth<Payment>(`/payments/${id}/approve`, {
    method: "PATCH",
    body: { adminNote },
  });
  if (!res.data) throw new Error("No payment returned");
  return res.data;
}

export async function rejectPayment(id: string, adminNote: string): Promise<Payment> {
  const res = await requestAuth<Payment>(`/payments/${id}/reject`, {
    method: "PATCH",
    body: { adminNote },
  });
  if (!res.data) throw new Error("No payment returned");
  return res.data;
}

export function getReceiptUrl(paymentId: string): string {
  const token = localStorage.getItem("hrlodex_token");
  return `${API_BASE}/payments/${paymentId}/receipt?token=${token}`;
}

// Click Payment Integration
export interface InitiateClickPaymentPayload {
  tariffId: string;
  amount: number;
}

export interface ClickPaymentResponse {
  paymentId: string;
  paymentUrl: string;
  amount: number;
  interviews: number;
}

export interface PaymePaymentResponse {
  paymentId: string;
  payUrl: string;
  amount: number;
  interviews: number;
}

export async function initiateClickPayment(payload: InitiateClickPaymentPayload): Promise<ClickPaymentResponse> {
  const res = await requestAuth<ClickPaymentResponse>("/payments/click/initiate", {
    method: "POST",
    body: payload,
  });
  if (!res.data) throw new Error("No payment data returned");
  return res.data;
}

export async function initiatePaymePayment(tariffId: string): Promise<PaymePaymentResponse> {
  const res = await requestAuth<PaymePaymentResponse>("/payments/payme/initiate", {
    method: "POST",
    body: { tariffId },
  });
  if (!res.data) throw new Error("No payment data returned");
  return res.data;
}

export async function checkClickPaymentStatus(paymentId: string): Promise<Payment> {
  const res = await requestAuth<Payment>(`/payments/click/callback?merchant_trans_id=${paymentId}`);
  if (!res.data) throw new Error("No payment data returned");
  return res.data;
}

