# HR Lodex - Client (Frontend)

HR Lodex is an AI-powered interview SaaS platform designed to streamline the hiring process using artificial intelligence. This is the frontend part of the application.

## 🚀 Texnologiyalar (Technologies)

- **Fremvork:** React.js (v19) + Vite
- **Styling:** TailwindCSS (v4)
- **Routing:** React Router v7
- **Grafiklar:** Recharts
- **Ikonkalar:** Lucide React
- **Sun'iy Intellekt:** Backend orqali Gemini AI
- **Tillar:** TypeScript

## 📁 Tuzilishi (Project Structure)

- `components/` - Qayta ishlatiladigan UI komponentlar.
- `views/` - Asosiy sahifalar (Admin, HR, Candidate, Landing, Auth, Jobs).
- `services/` - Backend API va tashqi xizmatlar bilan ishlash mantiqi.
- `utils/` - Yordamchi funksiyalar.
- `types.ts` - TypeScript interfeyslari va tiplari.

## ⚙️ O'rnatish va Ishga Tushirish

1. **Kutubxonalarni o'rnatish:**
   ```bash
   npm install
   ```

2. **Muhit o'zgaruvchilari (Environment Variables):**
   `.env.example` faylidan nusxa olib `.env` nomli fayl yarating:
   ```env
   VITE_API_URL=http://localhost:5001/api
   ```
   *(Eslatma: Backend porti macOS bilan port to'qnashuvlarining oldini olish uchun 5001 ga sozlangan bo'lishi tavsiya qilinadi)*

3. **Loyiha ishga tushirish (Development Mode):**
   ```bash
   npm run dev
   ```

4. **Loyiha build qilish (Production):**
   ```bash
   npm run build
   ```
