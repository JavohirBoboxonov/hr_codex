# HR Lodex - Server (Backend)

HR Lodex loyihasining backend qismi. U foydalanuvchilarni autentifikatsiya qilish, ish o'rinlari (jobs), intervyu sessiyalari, to'lovlar (Payme) va xabarlar kabi ma'lumotlarni boshqaradi.

## 🚀 Texnologiyalar (Technologies)

- **Fremvork:** Node.js, Express.js, TypeScript
- **Ma'lumotlar Bazasi:** MongoDB (Mongoose)
- **Xavfsizlik:** JWT (JSON Web Tokens), bcryptjs
- **Elektron Pochta:** Nodemailer
- **Fayl Yuklash:** Multer
- **Sun'iy Intellekt:** Google Generative AI (`@google/generative-ai`)

## 📁 Tuzilishi (Project Structure)

- `src/models/` - Mongoose sxemalari (User, Job, Application, InterviewSession, Payment, Tariff, ChatMessage, VerificationCode).
- `src/controllers/` - API mantiqi va funksiyalari.
- `src/routes/` - Express marshrutlari (Express routes).
- `src/middlewares/` - Avtorizatsiya va xatoliklarni ushlash kabi oraliq funksiyalar.
- `src/utils/` - Yordamchi funksiyalar.
- `src/config/` - Sozlamalar va ulanishlar.

## ⚙️ O'rnatish va Ishga Tushirish

1. **Kutubxonalarni o'rnatish:**
   ```bash
   npm install
   ```

2. **Muhit o'zgaruvchilari (Environment Variables):**
   `.env.example` faylidan nusxa olib `.env` nomli fayl yarating:
   ```env
   PORT=5001
   MONGODB_URI=mongodb://127.0.0.1:27017/hrlodex
   JWT_SECRET=supersecret
   JWT_EXPIRES_IN=7d
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=example@gmail.com
   EMAIL_PASS=app-password
   
   # Payme integration
   PAYME_MERCHANT_ID=your-merchant-id
   PAYME_KEY=your-merchant-key
   PAYME_CHECKOUT_URL=https://checkout.paycom.uz
   ```
   *(Eslatma: MONGODB_URI uchun IPv6 bog'lanish muammolarini oldini olish uchun `localhost` o'rniga `127.0.0.1` ishlatiladi)*

3. **Loyiha ishga tushirish (Development Mode):**
   Oldin MongoDB mahalliy muhitda ishlayotganiga ishonch hosil qiling (`brew services start mongodb-community`).
   ```bash
   npm run dev
   ```
   Development rejimida `tsx` TypeScript manbasini to'g'ridan-to'g'ri ishga tushiradi.

4. **Production build:**
   ```bash
   npm run build
   npm start
   ```
   `npm run build` `src/` dan `dist/` ga kompilyatsiya qiladi; PM2 va production `dist/index.js` ni ishga tushirishi kerak.

5. **Admin yaratish skripti:**
   Birinchi marta bazaga admin foydalanuvchi qo'shish uchun maxsus skript:
   ```bash
   npm run create-admin
   ```
