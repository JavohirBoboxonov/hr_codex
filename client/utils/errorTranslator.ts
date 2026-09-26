import { Language } from '../types';
import { UI_STRINGS } from '../translations';

// Error kodlarini tarjima qilish
export function translateError(errorCode: string | undefined, language: Language): string {
  if (!errorCode) return '';
  
  const strings = UI_STRINGS[language];
  
  // Error kodlarini tarjima qilish
  const errorMap: Record<string, keyof typeof strings> = {
    // Auth errors
    'AUTH_REQUIRED_FIELDS': 'auth',
    'AUTH_EMAIL_EXISTS': 'auth',
    'AUTH_EMAIL_NOT_VERIFIED': 'auth',
    'AUTH_INVALID_CODE': 'auth',
    'AUTH_CODE_EXPIRED': 'auth',
    'AUTH_INVALID_CREDENTIALS': 'auth',
    'AUTH_ROLE_NOT_SELECTED': 'auth',
    'AUTH_INVALID_ROLE': 'auth',
    
    // Job errors
    'JOB_NOT_FOUND': 'hr',
    'JOB_INACTIVE': 'hr',
    'JOB_INSUFFICIENT_CREDITS': 'hr',
    'JOB_TITLE_REQUIRED': 'hr',
    'JOB_DESC_REQUIRED': 'hr',
    
    // Payment errors
    'PAYMENT_TARIFF_ID_REQUIRED': 'hr',
    'PAYMENT_TARIFF_NOT_FOUND': 'hr',
    'PAYMENT_AMOUNT_MISMATCH': 'hr',
    'PAYMENT_RECEIPT_REQUIRED': 'hr',
    'PAYMENT_NOT_FOUND': 'hr',
    'PAYMENT_ALREADY_PROCESSED': 'hr',
    'PAYMENT_REJECTION_REASON_REQUIRED': 'hr',
    
    // Application errors
    'APP_JOB_NOT_FOUND': 'candidate',
    'APP_INVITE_CODE_REQUIRED': 'candidate',
    'APP_NAME_EMAIL_REQUIRED': 'candidate',
    'APP_RESUME_REQUIRED': 'candidate',
    'APP_ALREADY_APPLIED': 'candidate',
    'APP_NOT_FOUND': 'candidate',
    
    // Session errors
    'SESSION_INSUFFICIENT_CREDITS': 'hr',
    'SESSION_NOT_FOUND': 'candidate',
    
    // Chat errors
    'CHAT_APP_NOT_FOUND': 'hr',
    'CHAT_MESSAGE_REQUIRED': 'hr',
    
    // General errors
    'SERVER_ERROR': 'common',
    'UNAUTHORIZED': 'common',
    'FORBIDDEN': 'common',
    'NOT_FOUND': 'common',
    'VALIDATION_ERROR': 'common',
  };
  
  // Agar error code mapping'da bo'lsa, backend'dan kelgan message ni qaytarish
  // Chunki backend allaqachon tarjima qilgan
  return '';
}

// Backend'dan kelgan error response ni tarjima qilish
export function translateApiError(error: any, language: Language): string {
  // Agar errorCode bo'lsa va message bo'lsa, message ni qaytarish (backend allaqachon tarjima qilgan)
  if (error?.errorCode && error?.message) {
    return error.message;
  }
  
  // Agar faqat message bo'lsa, uni qaytarish
  if (error?.message) {
    return error.message;
  }
  
  // Agar errorCode bo'lsa, uni tarjima qilish
  if (error?.errorCode) {
    return translateError(error.errorCode, language);
  }
  
  // Default
  return error?.toString() || UI_STRINGS[language].common.error || 'Error';
}
