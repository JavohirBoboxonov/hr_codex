# HR Lodex - Frontend API Hujjati

**Base URL:** `http://localhost:5000/api`

---

## Autentifikatsiya

Himoyalangan endpointlar uchun har bir so'rovda:
```
Authorization: Bearer <token>
Content-Type: application/json
```

---

# Mundarija

1. [Auth API](#1-auth-api)
2. [Jobs API (Employer)](#2-jobs-api-employer)
3. [Applications API (Employer)](#3-applications-api-employer)
4. [Sessions API (Employer)](#4-sessions-api-employer)
5. [Chat API (Employer)](#5-chat-api-employer)
6. [Public API (Hammaga ochiq)](#6-public-api-hammaga-ochiq)
7. [Payments API](#7-payments-api)

---

# 1. Auth API

**Base:** `/api/auth`

## 1.1 Ro'yxatdan o'tish

**POST** `/api/auth/register`

```json
{
  "fullName": "Ali Valiyev",
  "email": "ali@example.com",
  "password": "parol123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Ro'yxatdan o'tdingiz. Elektron pochtangizga tasdiqlash kodi yuborildi.",
  "data": {
    "userId": "...",
    "email": "ali@example.com",
    "fullName": "Ali Valiyev"
  }
}
```

---

## 1.2 Email tasdiqlash

**POST** `/api/auth/verify-email`

```json
{
  "email": "ali@example.com",
  "code": "123456"
}
```

---

## 1.3 Kodni qayta yuborish

**POST** `/api/auth/resend-code`

```json
{
  "email": "ali@example.com",
  "type": "register"  // yoki "login"
}
```

---

## 1.4 Rol tanlash

**POST** `/api/auth/select-role`

```json
{
  "email": "ali@example.com",
  "role": "employer"  // yoki "candidate"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "fullName": "Ali Valiyev",
      "email": "ali@example.com",
      "role": "employer"
    },
    "token": "eyJhbGc...",
    "expiresIn": "7d"
  }
}
```

---

## 1.5 Login

**POST** `/api/auth/login`

```json
{
  "email": "ali@example.com",
  "password": "parol123"
}
```

---

## 1.6 Login tasdiqlash

**POST** `/api/auth/verify-login`

```json
{
  "email": "ali@example.com",
  "code": "123456"
}
```

**Response:** user, token, expiresIn

---

# 2. Jobs API (Employer)

**Base:** `/api/jobs`  
**Role:** `employer`, `admin`  
**Auth:** Kerak

## 2.1 Barcha ishlarni olish

**GET** `/api/jobs`

**Query params:**
- `status` (optional): `Active`, `Paused`, `Archived`, `Closed`
- `visibility` (optional): `PUBLIC`, `PRIVATE`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "Senior Frontend Developer",
      "department": "IT",
      "role": "Frontend Developer",
      "description": "...",
      "experienceLevel": "Senior",
      "requiredSkills": ["React", "TypeScript"],
      "interviewType": "VOICE",
      "interviewCategory": "TECHNICAL",
      "interviewMode": "INSTANT",
      "visibility": "PUBLIC",
      "sourceLanguage": "ru",
      "resumeRequired": true,
      "questions": [...],
      "status": "Active",
      "shareToken": "abc123xyz",
      "inviteCode": "INV-A1B2",
      "createdAt": "2025-01-31T..."
    }
  ]
}
```

---

## 2.2 Bitta ishni olish

**GET** `/api/jobs/:id`

---

## 2.3 Yangi ish yaratish

**POST** `/api/jobs`

```json
{
  "title": "Senior Frontend Developer",
  "department": "IT",
  "role": "Frontend Developer",
  "description": "Ish tavsifi...",
  "experienceLevel": "Senior",
  "requiredSkills": ["React", "TypeScript", "Tailwind"],
  "interviewType": "VOICE",
  "interviewCategory": "TECHNICAL",
  "interviewMode": "INSTANT",
  "visibility": "PUBLIC",
  "sourceLanguage": "ru",
  "resumeRequired": true,
  "questions": [
    {
      "id": "q1",
      "text": "React hooks haqida gapiring",
      "category": "Technical",
      "answerType": "VOICE",
      "difficulty": "Senior"
    }
  ],
  "deadline": "2025-02-28T23:59:59Z",
  "status": "Active"
}
```

**Response (201):** Yaratilgan ish (shareToken va inviteCode avtomatik generatsiya qilinadi)

---

## 2.4 Ishni yangilash

**PATCH** `/api/jobs/:id`

```json
{
  "status": "Paused",
  "title": "Yangi nom"
}
```

---

## 2.5 Ishni o'chirish

**DELETE** `/api/jobs/:id`

---

# 3. Applications API (Employer)

**Base:** `/api/applications`  
**Role:** `employer`, `admin`  
**Auth:** Kerak

## 3.1 Barcha arizalarni olish

**GET** `/api/applications`

HRning barcha ishlariga yuborilgan arizalar.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "jobId": "...",
      "name": "Sardor Karimov",
      "email": "sardor@example.com",
      "phone": "+998901234567",
      "experienceYears": 3,
      "resumeFileName": "resume.pdf",
      "resumeMimeType": "application/pdf",
      "resumeBase64": "...",
      "analysis": {
        "skillsScore": 85,
        "experienceScore": 70,
        "relevanceScore": 90,
        "overallScore": 82,
        "detectedSkills": ["React", "TypeScript"],
        "summary": "Yaxshi nomzod...",
        "suitabilityLabel": "High"
      },
      "status": "Screened",
      "appliedAt": "2025-01-31T..."
    }
  ]
}
```

---

## 3.2 Ish bo'yicha arizalar

**GET** `/api/applications/job/:jobId`

---

## 3.3 Ariza statusini yangilash

**PATCH** `/api/applications/:id/status`

```json
{
  "status": "Interviewing"
}
```

**Status qiymatlari:** `Applied`, `Screened`, `Interviewing`, `Completed`, `Rejected`

---

# 4. Sessions API (Employer)

**Base:** `/api/sessions`  
**Role:** `employer`, `admin`  
**Auth:** Kerak

## 4.1 Statistika

**GET** `/api/sessions/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSessions": 45,
    "completedSessions": 38,
    "pendingSessions": 7,
    "averageScore": 7.2,
    "recommendations": {
      "Strong Hire": 5,
      "Hire": 18,
      "Maybe": 12,
      "Reject": 3
    }
  }
}
```

---

## 4.2 Barcha sessiyalarni olish

**GET** `/api/sessions`

**Query params:**
- `status` (optional): `Started`, `In Progress`, `Completed`, `Terminated`
- `jobId` (optional): Ish ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "jobId": "...",
      "applicationId": "...",
      "candidateId": "CAND-A1B2C3",
      "status": "Completed",
      "answers": [...],
      "evaluation": {...},
      "startedAt": "...",
      "completedAt": "...",
      "language": "ru"
    }
  ]
}
```

---

## 4.3 Ish bo'yicha sessiyalar

**GET** `/api/sessions/job/:jobId`

---

## 4.4 Sessiya to'liq ma'lumotlari

**GET** `/api/sessions/:id/details`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "candidateId": "CAND-A1B2C3",
    "status": "Completed",
    "language": "ru",
    "startedAt": "2025-01-31T10:00:00Z",
    "completedAt": "2025-01-31T10:30:00Z",
    "job": {
      "id": "...",
      "title": "Senior Frontend Developer",
      "department": "IT",
      "experienceLevel": "Senior",
      "questions": [...]
    },
    "application": {
      "id": "...",
      "name": "Sardor Karimov",
      "email": "sardor@example.com",
      "phone": "+998901234567",
      "experienceYears": 3,
      "resumeFileName": "resume.pdf",
      "analysis": {...}
    },
    "answers": [
      {
        "questionId": "q1",
        "questionText": "React hooks haqida gapiring",
        "text": "Nomzod javobi...",
        "score": 8,
        "feedback": "Yaxshi javob, chuqur tushuncha ko'rsatildi",
        "timestamp": "2025-01-31T10:05:00Z"
      }
    ],
    "evaluation": {
      "technicalScore": 8,
      "communicationScore": 7,
      "problemSolvingScore": 9,
      "overallScore": 8,
      "overallRecommendation": "Hire",
      "summary": "Nomzod texnik jihatdan kuchli...",
      "strengths": ["React bilimi", "Problem solving"],
      "weaknesses": ["System design tajribasi kam"]
    }
  }
}
```

---

## 4.5 Sessiyani ID bo'yicha olish

**GET** `/api/sessions/:id`

---

# 5. Chat API (Employer)

**Base:** `/api/chat`  
**Role:** `employer`, `admin`  
**Auth:** Kerak

## 5.1 Xabarlarni olish

**GET** `/api/chat`

**Query params:**
- `applicationId` (optional): Ma'lum ariza bo'yicha filtrlash

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "applicationId": "...",
      "text": "Salom, intervyuga taklif qilamiz",
      "senderName": "HR Manager",
      "timestamp": "2025-01-31T...",
      "isRead": false
    }
  ]
}
```

---

## 5.2 Xabar yuborish

**POST** `/api/chat/:applicationId`

```json
{
  "text": "Salom, keyingi bosqichga o'tdingiz!"
}
```

---

# 6. Public API (Hammaga ochiq)

# 7. Payments API

**Base:** `/api/payments`

### 7.1 Manual payment (chek bilan)
**POST** `/api/payments/create`

Form-data (token, role `employer`):
- `tariffId` — Tarif ID
- `amount` — Tarif narxi (tekshiriladi)
- `receipt` — JPEG/PNG/PDF (≤5MB)

Creates `Pending` payment. Admin approves/rejects.

### 7.2 Payme bilan to'lovni boshlash
**POST** `/api/payments/payme/initiate`

Body: `{ "tariffId": "..." }`

Returns Payme checkout URL and payment id. Redirect user to `payUrl`.

### 7.3 Payme merchant callback
**POST** `/api/payments/payme/merchant`

Basic Auth: `Paycom:<PAYME_KEY>`

Implements Payme JSON-RPC methods: `CheckPerformTransaction`, `CreateTransaction`, `PerformTransaction`, `CancelTransaction`, `CheckTransaction`, `GetStatement`.

### 7.4 Admin approve/reject/cancel manual
- `PATCH /api/payments/:id/approve`
- `PATCH /api/payments/:id/reject`
- `PATCH /api/payments/:id/cancel`

### 7.5 Click bilan to'lovni boshlash
**POST** `/api/payments/click/initiate`

Body: `{ "tariffId": "...", "amount": 5000 }`

Returns Click payment URL and `paymentId`. Frontend should redirect user to `paymentUrl`.

### 7.6 Click webhook callback'lar
- `POST /api/payments/click/prepare`
- `POST /api/payments/click/complete`

Click serverlari ushbu endpointlarga chaqiradi.

### 7.7 Click return status (auth required)
**GET** `/api/payments/click/callback?merchant_trans_id=<paymentId>`

Frontend ushbu endpoint orqali qaytgan to'lov holatini tekshiradi.

### 7.8 Default tariflar
Server ishga tushganda default tariflar avtomatik yaratiladi:
- 1 ta intervyu: `5 000` so'm
- Oylik paket (10 intervyu): `50 000` so'm


**Base:** `/api/public`  
**Auth:** Kerak emas

## 6.1 Ishni token orqali olish

**GET** `/api/public/jobs/token/:token`

Intervyu havolasi uchun (`/#/i/:token`)

---

## 6.2 Taklif kodini tekshirish

**POST** `/api/public/validate-invite`

```json
{
  "code": "INV-A1B2"
}
```

**Response (200):** Ish ma'lumotlari (kod to'g'ri bo'lsa)

---

## 6.3 Ishga ariza yuborish

**POST** `/api/public/jobs/:jobId/apply`

**Auth:** Kerak (Role: candidate)
**Query:** `code` (optional - PRIVATE ishlar uchun kerak)

```json
{
  "name": "Sardor Karimov",
  "email": "sardor@example.com",
  "phone": "+998901234567",
  "experienceYears": 3,
  "resumeFileName": "resume.pdf",
  "resumeMimeType": "application/pdf",
  "resumeBase64": "JVBERi0xLjQK...",
  "analysis": {
    "skillsScore": 85,
    "experienceScore": 70,
    "relevanceScore": 90,
    "overallScore": 82,
    "detectedSkills": ["React", "TypeScript"],
    "summary": "...",
    "suitabilityLabel": "High"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Ariza muvaffaqiyatli yuborildi",
  "data": {
    "id": "...",
    "jobId": "...",
    "name": "Sardor Karimov",
    ...
  }
}
```

---

## 6.4 Intervyu sessiyasini boshlash

**POST** `/api/public/sessions/start`

**Auth:** Kerak (Role: candidate)

```json
{
  "jobId": "...",
  "code": "INV-A1B2",
  "applicationId": "...",
  "language": "ru"
}
```

**Eslatma:** `jobId` yoki `code` dan bittasi kerak.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "jobId": "...",
    "applicationId": "...",
    "candidateId": "CAND-A1B2C3",
    "status": "Started",
    "answers": [],
    "startedAt": "2025-01-31T...",
    "language": "ru"
  }
}
```

---

## 6.5 Sessiyani tugatish (AI baholash)

**PATCH** `/api/public/sessions/:id/complete`

**Auth:** Kerak (Role: candidate)

```json
{
  "answers": [
    {
      "questionId": "q1",
      "questionText": "React hooks haqida gapiring",
      "text": "Nomzodning javobi..."
    },
    {
      "questionId": "q2",
      "questionText": "TypeScript afzalliklari nimada?",
      "text": "Nomzodning javobi..."
    }
  ],
  "skipAiEvaluation": false
}
```

**Eslatma:** `skipAiEvaluation: true` bo'lsa, AI baholash o'tkazib yuboriladi.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "jobId": "...",
    "candidateId": "CAND-A1B2C3",
    "status": "Completed",
    "answers": [
      {
        "questionId": "q1",
        "questionText": "React hooks haqida gapiring",
        "text": "Nomzodning javobi...",
        "score": 8,
        "feedback": "Yaxshi javob, hooks ni to'g'ri tushuntirdi",
        "timestamp": "2025-01-31T..."
      }
    ],
    "evaluation": {
      "technicalScore": 8,
      "communicationScore": 7,
      "problemSolvingScore": 9,
      "overallScore": 8,
      "overallRecommendation": "Hire",
      "summary": "Nomzod texnik jihatdan kuchli, React va TypeScript bilimi yaxshi.",
      "strengths": ["React hooks bilimi", "Aniq tushuntirish"],
      "weaknesses": ["System design tajribasi kam"]
    },
    "completedAt": "2025-01-31T..."
  }
}
```

---

# Xato kodlari

| HTTP | Tavsif |
|------|--------|
| 200 | Muvaffaqiyatli |
| 201 | Yaratildi |
| 400 | Noto'g'ri so'rov (validation xatosi) |
| 401 | Avtorizatsiya talab qilinadi / Token noto'g'ri |
| 403 | Ruxsat yo'q (role mos emas) |
| 404 | Topilmadi |
| 500 | Server xatosi |

**Xato formati:**
```json
{
  "success": false,
  "message": "Xato xabari"
}
```

---

# Role bo'yicha endpoint xulosa

## Employer (ish beruvchi)

| Endpoint | Method | Tavsif |
|----------|--------|--------|
| `/api/jobs` | GET | Barcha ishlarni olish |
| `/api/jobs/:id` | GET | Bitta ishni olish |
| `/api/jobs` | POST | Yangi ish yaratish |
| `/api/jobs/:id` | PATCH | Ishni yangilash |
| `/api/jobs/:id` | DELETE | Ishni o'chirish |
| `/api/applications` | GET | Barcha arizalar |
| `/api/applications/job/:jobId` | GET | Ish bo'yicha arizalar |
| `/api/applications/:id/status` | PATCH | Ariza statusini yangilash |
| `/api/sessions/stats` | GET | Statistika |
| `/api/sessions` | GET | Barcha sessiyalar |
| `/api/sessions/job/:jobId` | GET | Ish bo'yicha sessiyalar |
| `/api/sessions/:id/details` | GET | Sessiya to'liq ma'lumotlari |
| `/api/sessions/:id` | GET | Sessiyani olish |
| `/api/chat` | GET | Xabarlar |
| `/api/chat/:applicationId` | POST | Xabar yuborish |

## Candidate (nomzod) - Public

| Endpoint | Method | Tavsif |
|----------|--------|--------|
| `/api/public/jobs/token/:token` | GET | Ishni token orqali olish |
| `/api/public/validate-invite` | POST | Taklif kodini tekshirish |
| `/api/public/jobs/:jobId/apply` | POST | Ariza yuborish |
| `/api/public/sessions/start` | POST | Sessiya boshlash |
| `/api/public/sessions/:id/complete` | PATCH | Sessiya tugatish (AI baholash) |

---

# .env sozlamalari

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hr-lodex
JWT_SECRET=sizning-maxfiy-kalitingiz
JWT_EXPIRES_IN=7d

# Email
EMAIL_USE_ETHEREAL=true
# yoki Gmail:
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=email@gmail.com
# EMAIL_PASS=app-password

# Gemini AI (intervyu baholash uchun)
GEMINI_API_KEY=sizning_gemini_api_kalitingiz
```
