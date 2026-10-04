import { Language } from '../types';

// Environment variable'dan API URL olish, fallback sifatida localhost
export const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://backend.hrlodex.uz/api" : "http://localhost:5001/api");

export type ApiResponse<T = unknown> = {
  success: boolean;
  message?: string;
  errorCode?: string;
  data?: T;
};

export type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: object;
  language?: Language;
};

// Til kodini Language enum dan string ga o'girish
function getLanguageHeader(language?: Language): string {
  if (!language) {
    // localStorage dan olish
    const saved = localStorage.getItem('language');
    if (saved === 'ru' || saved === 'en' || saved === 'uz') return saved;
    return 'uz'; // default
  }
  return language === Language.RU ? 'ru' : (language === Language.EN ? 'en' : 'uz');
}

// Retries on network-level failures (e.g. ERR_QUIC_PROTOCOL_ERROR which surfaces
// as TypeError: Failed to fetch). On retry the browser falls back to HTTP/2.
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

export async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { method = "GET", headers = {}, body, language } = options;
  const langHeader = getLanguageHeader(language);
  
  const res = await fetchWithRetry(`${API_BASE}${path}`, {
    method,
    headers: { 
      "Content-Type": "application/json",
      "Accept-Language": langHeader,
      ...headers 
    },
    ...(body != null && { body: JSON.stringify(body) }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Backend'dan kelgan errorCode va message ni qaytarish
    const error = new Error((json as ApiResponse).message ?? `HTTP ${res.status}`);
    (error as any).errorCode = (json as ApiResponse).errorCode;
    (error as any).response = json;
    throw error;
  }
  return json as ApiResponse<T>;
}

export function getToken(): string | null {
  return getAuth()?.token ?? null;
}

export async function requestAuth<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const { method = "GET", headers = {}, body, language } = options;
  const langHeader = getLanguageHeader(language);
  
  const res = await fetchWithRetry(`${API_BASE}${path}`, {
    method,
    headers: { 
      "Content-Type": "application/json",
      "Accept-Language": langHeader,
      Authorization: `Bearer ${token}`, 
      ...headers 
    },
    ...(body != null && { body: JSON.stringify(body) }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      clearAuth();
      // Current path-ni saqlab qolish
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = `/auth?redirect=${encodeURIComponent(currentPath)}`;
    }
    // Backend'dan kelgan errorCode va message ni qaytarish
    const error = new Error((json as ApiResponse).message ?? `HTTP ${res.status}`);
    (error as any).errorCode = (json as ApiResponse).errorCode;
    (error as any).response = json;
    (error as any).status = res.status;
    throw error;
  }
  return json as ApiResponse<T>;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  referralCode?: string;
}

export interface RegisterResult {
  userId: string;
  email: string;
  fullName: string;
}

export function register(data: RegisterData, language?: Language) {
  return request<RegisterResult>("/auth/register", {
    method: "POST",
    body: data,
    language,
  });
}

export function verifyEmail(email: string, code: string, language?: Language) {
  return request<{ email: string }>("/auth/verify-email", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), code: code.trim() },
    language,
  });
}

export function resendCode(email: string, type: "register" | "login", language?: Language) {
  return request("/auth/resend-code", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), type },
    language,
  });
}

export type ApiRole = "employer" | "candidate" | "admin";

export interface SelectRoleResult {
  user: { id: string; fullName: string; email: string; role: ApiRole };
  token: string;
  expiresIn: string;
}

export function selectRole(email: string, role: ApiRole, language?: Language) {
  return request<SelectRoleResult>("/auth/select-role", {
    method: "POST",
    body: { email, role },
    language,
  });
}

export function login(email: string, password: string, language?: Language) {
  return request<SelectRoleResult>("/auth/login", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password: password.trim() },
    language,
  });
}

export function verifyLogin(email: string, code: string, language?: Language) {
  return request<SelectRoleResult>("/auth/verify-login", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), code: code.trim() },
    language,
  });
}

export function forgotPassword(email: string, language?: Language) {
  return request("/auth/forgot-password", {
    method: "POST",
    body: { email },
    language,
  });
}

export function verifyResetCode(email: string, code: string, language?: Language) {
  return request("/auth/verify-reset-code", {
    method: "POST",
    body: { email, code },
    language,
  });
}

export function resetPassword(email: string, code: string, newPassword: string, confirmPassword: string, language?: Language) {
  return request("/auth/reset-password", {
    method: "POST",
    body: { email, code, newPassword, confirmPassword },
    language,
  });
}

export function getGoogleAuthUrl(): string {
  return `${API_BASE}/auth/google`;
}

export const AUTH_TOKEN_KEY = "hrlodex_token";
export const AUTH_USER_KEY = "hrlodex_user";

export function setAuth(token: string, user: object) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function getAuth(): { token: string; user: object } | null {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const userJson = localStorage.getItem(AUTH_USER_KEY);
  if (token === null || !userJson) return null;
  try {
    return { token, user: JSON.parse(userJson) };
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}