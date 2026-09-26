// Xatolik xabarlari tarjimalari
const errorMessages = {
  ru: {
    // Auth errors
    'AUTH_REQUIRED_FIELDS': 'Полное имя, электронная почта и пароль обязательны',
    'AUTH_EMAIL_EXISTS': 'Этот адрес электронной почты уже зарегистрирован',
    'AUTH_EMAIL_NOT_VERIFIED': 'Сначала подтвердите вашу электронную почту',
    'AUTH_INVALID_CODE': 'Неверный код подтверждения',
    'AUTH_CODE_EXPIRED': 'Срок действия кода подтверждения истек',
    'AUTH_INVALID_CREDENTIALS': 'Неверный адрес электронной почты или пароль',
    'AUTH_ROLE_NOT_SELECTED': 'Сначала выберите роль',
    'AUTH_INVALID_ROLE': 'Роль должна быть "employer" (работодатель) или "candidate" (кандидат)',
    'AUTH_USER_NOT_FOUND': 'Пользователь не найден',
    'AUTH_PASSWORD_MISMATCH': 'Пароли не совпадают',
    
    // Job errors
    'JOB_NOT_FOUND': 'Работа не найдена',
    'JOB_INACTIVE': 'Работа не найдена или неактивна',
    'JOB_INSUFFICIENT_CREDITS': 'Бесплатные работы закончились. Для создания новых работ нужны собеседования. Пожалуйста, оплатите.',
    'JOB_TITLE_REQUIRED': 'Название вакансии обязательно',
    'JOB_DESC_REQUIRED': 'Описание вакансии обязательно',
    
    // Payment errors
    'PAYMENT_TARIFF_ID_REQUIRED': 'ID тарифа и сумма обязательны',
    'PAYMENT_TARIFF_NOT_FOUND': 'Тариф не найден или неактивен',
    'PAYMENT_AMOUNT_MISMATCH': 'Сумма платежа не соответствует цене тарифа',
    'PAYMENT_RECEIPT_REQUIRED': 'Чек платежа (скриншот) обязателен',
    'PAYMENT_NOT_FOUND': 'Платеж не найден',
    'PAYMENT_ALREADY_PROCESSED': 'Платеж уже обработан',
    'PAYMENT_REJECTION_REASON_REQUIRED': 'Причина отклонения обязательна',
    'PAYMENT_PAYME_CONFIG_REQUIRED': 'Настройки Payme неполные',
    
    // Application errors
    'APP_JOB_NOT_FOUND': 'Работа не найдена или прием заявок закрыт',
    'APP_INVITE_CODE_REQUIRED': 'Для этой работы требуется код приглашения',
    'APP_NAME_EMAIL_REQUIRED': 'Имя и электронная почта обязательны',
    'APP_RESUME_REQUIRED': 'Загрузка резюме обязательна',
    'APP_ALREADY_APPLIED': 'Вы уже подали заявку на эту работу',
    'APP_NOT_FOUND': 'Заявка не найдена',
    
    // Session errors
    'SESSION_INSUFFICIENT_CREDITS': 'Недостаточно собеседований для проведения интервью. Пожалуйста, оплатите.',
    'SESSION_NOT_FOUND': 'Сессия не найдена',
    
    // Chat errors
    'CHAT_APP_NOT_FOUND': 'Заявка не найдена',
    'CHAT_MESSAGE_REQUIRED': 'Текст сообщения обязателен',
    
    // General errors
    'SERVER_ERROR': 'Произошла ошибка сервера',
    'UNAUTHORIZED': 'Не авторизован',
    'FORBIDDEN': 'Доступ запрещен',
    'NOT_FOUND': 'Не найдено',
    'VALIDATION_ERROR': 'Ошибка валидации',
  },
  en: {
    // Auth errors
    'AUTH_REQUIRED_FIELDS': 'Full name, email and password are required',
    'AUTH_EMAIL_EXISTS': 'This email address is already registered',
    'AUTH_EMAIL_NOT_VERIFIED': 'Please verify your email first',
    'AUTH_INVALID_CODE': 'Invalid verification code',
    'AUTH_CODE_EXPIRED': 'Verification code has expired',
    'AUTH_INVALID_CREDENTIALS': 'Invalid email or password',
    'AUTH_ROLE_NOT_SELECTED': 'Please select a role first',
    'AUTH_INVALID_ROLE': 'Role must be "employer" or "candidate"',
    'AUTH_USER_NOT_FOUND': 'User not found',
    'AUTH_PASSWORD_MISMATCH': 'Passwords do not match',
    
    // Job errors
    'JOB_NOT_FOUND': 'Job not found',
    'JOB_INACTIVE': 'Job not found or inactive',
    'JOB_INSUFFICIENT_CREDITS': 'Free jobs exhausted. Interviews needed to create new jobs. Please make a payment.',
    'JOB_TITLE_REQUIRED': 'Job title is required',
    'JOB_DESC_REQUIRED': 'Job description is required',
    
    // Payment errors
    'PAYMENT_TARIFF_ID_REQUIRED': 'Tariff ID and amount are required',
    'PAYMENT_TARIFF_NOT_FOUND': 'Tariff not found or inactive',
    'PAYMENT_AMOUNT_MISMATCH': 'Payment amount does not match tariff price',
    'PAYMENT_RECEIPT_REQUIRED': 'Payment receipt (screenshot) is required',
    'PAYMENT_NOT_FOUND': 'Payment not found',
    'PAYMENT_ALREADY_PROCESSED': 'Payment already processed',
    'PAYMENT_REJECTION_REASON_REQUIRED': 'Rejection reason is required',
    'PAYMENT_PAYME_CONFIG_REQUIRED': 'Payme configuration is incomplete',
    
    // Application errors
    'APP_JOB_NOT_FOUND': 'Job not found or applications closed',
    'APP_INVITE_CODE_REQUIRED': 'Invite code required for this job',
    'APP_NAME_EMAIL_REQUIRED': 'Name and email are required',
    'APP_RESUME_REQUIRED': 'Resume upload is required',
    'APP_ALREADY_APPLIED': 'You have already applied for this job',
    'APP_NOT_FOUND': 'Application not found',
    
    // Session errors
    'SESSION_INSUFFICIENT_CREDITS': 'Insufficient interviews to conduct interview. Please make a payment.',
    'SESSION_NOT_FOUND': 'Session not found',
    
    // Chat errors
    'CHAT_APP_NOT_FOUND': 'Application not found',
    'CHAT_MESSAGE_REQUIRED': 'Message text is required',
    
    // General errors
    'SERVER_ERROR': 'Server error occurred',
    'UNAUTHORIZED': 'Unauthorized',
    'FORBIDDEN': 'Forbidden',
    'NOT_FOUND': 'Not found',
    'VALIDATION_ERROR': 'Validation error',
  },
  uz: {
    // Auth errors
    'AUTH_REQUIRED_FIELDS': 'To\'liq ism, elektron pochta va parol kiritilishi shart',
    'AUTH_EMAIL_EXISTS': 'Bu elektron pochta allaqachon ro\'yxatdan o\'tgan',
    'AUTH_EMAIL_NOT_VERIFIED': 'Avval elektron pochtangizni tasdiqlang',
    'AUTH_INVALID_CODE': 'Noto\'g\'ri tasdiqlash kodi',
    'AUTH_CODE_EXPIRED': 'Tasdiqlash kodining muddati tugagan',
    'AUTH_INVALID_CREDENTIALS': 'Noto\'g\'ri elektron pochta yoki parol',
    'AUTH_ROLE_NOT_SELECTED': 'Avval rol tanlang',
    'AUTH_INVALID_ROLE': 'Rol "employer" (ish beruvchi) yoki "candidate" (nomzod) bo\'lishi kerak',
    'AUTH_USER_NOT_FOUND': 'Foydalanuvchi topilmadi',
    'AUTH_PASSWORD_MISMATCH': 'Parollar mos kelmayapti',
    
    // Job errors
    'JOB_NOT_FOUND': 'Ish topilmadi',
    'JOB_INACTIVE': 'Ish topilmadi yoki faol emas',
    'JOB_INSUFFICIENT_CREDITS': 'Bepul ishlar tugadi. Yangi ishlar yaratish uchun suhbatlar kerak. Iltimos, to\'lov qiling.',
    'JOB_TITLE_REQUIRED': 'Ish nomi majburiy',
    'JOB_DESC_REQUIRED': 'Ish tavsifi majburiy',
    
    // Payment errors
    'PAYMENT_TARIFF_ID_REQUIRED': 'Tarif ID va summa kiritilishi shart',
    'PAYMENT_TARIFF_NOT_FOUND': 'Tarif topilmadi yoki faol emas',
    'PAYMENT_AMOUNT_MISMATCH': 'To\'lov summasi tarif narxiga mos kelmaydi',
    'PAYMENT_RECEIPT_REQUIRED': 'To\'lov cheki (screenshot) yuborilishi shart',
    'PAYMENT_NOT_FOUND': 'To\'lov topilmadi',
    'PAYMENT_ALREADY_PROCESSED': 'To\'lov allaqachon qayta ishlangan',
    'PAYMENT_REJECTION_REASON_REQUIRED': 'Rad etish sababi kiritilishi shart',
    'PAYMENT_PAYME_CONFIG_REQUIRED': 'Payme sozlamalari to\'liq emas',
    
    // Application errors
    'APP_JOB_NOT_FOUND': 'Ish topilmadi yoki qabul qilish yopilgan',
    'APP_INVITE_CODE_REQUIRED': 'Ushbu ish uchun taklif kodi kerak',
    'APP_NAME_EMAIL_REQUIRED': 'Ism va email majburiy',
    'APP_RESUME_REQUIRED': 'Rezyume yuklash majburiy',
    'APP_ALREADY_APPLIED': 'Siz ushbu ishga allaqachon ariza yuborgansiz',
    'APP_NOT_FOUND': 'Ariza topilmadi',
    
    // Session errors
    'SESSION_INSUFFICIENT_CREDITS': 'Suhbat o\'tkazish uchun suhbatlar yetarli emas. Iltimos, to\'lov qiling.',
    'SESSION_NOT_FOUND': 'Sessiya topilmadi',
    
    // Chat errors
    'CHAT_APP_NOT_FOUND': 'Ariza topilmadi',
    'CHAT_MESSAGE_REQUIRED': 'Xabar matni kerak',
    
    // General errors
    'SERVER_ERROR': 'Server xatosi yuz berdi',
    'UNAUTHORIZED': 'Ruxsat berilmagan',
    'FORBIDDEN': 'Taqiqlangan',
    'NOT_FOUND': 'Topilmadi',
    'VALIDATION_ERROR': 'Validatsiya xatosi',
  },
};

// Til kodini request'dan olish
function getLanguageFromRequest(req) {
  // Accept-Language header dan olish (case-insensitive)
  const acceptLanguage = (req.headers['accept-language'] || req.headers['Accept-Language'] || '').toLowerCase();
  if (acceptLanguage.includes('uz')) return 'uz';
  if (acceptLanguage.includes('ru')) return 'ru';
  if (acceptLanguage.includes('en')) return 'en';
  
  // Body yoki query dan olish
  if (req.body?.language) {
    const lang = req.body.language.toLowerCase();
    if (lang === 'uz' || lang === 'ru' || lang === 'en') return lang;
  }
  
  if (req.query?.language) {
    const lang = req.query.language.toLowerCase();
    if (lang === 'uz' || lang === 'ru' || lang === 'en') return lang;
  }
  
  // Default
  return 'uz';
}

// Xatolik xabarini tarjima qilish
function translateError(errorCode, language = 'uz') {
  const lang = language === 'uz' ? 'uz' : (language === 'ru' ? 'ru' : 'en');
  return errorMessages[lang]?.[errorCode] || errorMessages.uz[errorCode] || errorCode;
}

// Xatolik response yaratish
function createErrorResponse(req, errorCode, statusCode = 400, additionalData = {}) {
  const language = getLanguageFromRequest(req);
  const message = translateError(errorCode, language);
  
  return {
    success: false,
    errorCode,
    message,
    ...additionalData,
  };
}

export {
  errorMessages,
  getLanguageFromRequest,
  translateError,
  createErrorResponse,
};
