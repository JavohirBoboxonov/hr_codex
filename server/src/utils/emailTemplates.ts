// Email template'lari 3 tilda
const emailTemplates = {
  uz: {
    verification: {
      subject: 'Tasdiqlash kodingiz - HR Lodex',
      greeting: 'Salom!',
      body: 'HR Lodex platformasida ro\'yxatdan o\'tganingiz uchun rahmat. Hisobingizni faollashtirish uchun quyidagi tasdiqlash kodini kiriting:',
      expiry: 'Bu kod 10 daqiqa davomida amal qiladi.',
      ignore: 'Agar siz ushbu ro\'yxatdan o\'tish so\'rovini yubormagan bo\'lsangiz, xabarni e\'tiborsiz qoldirishingiz mumkin.',
      footer: 'HR Lodex — Intellektual ish qidirish platformasi',
    },
    resetPassword: {
      subject: 'Parolni tiklash kodingiz - HR Lodex',
      greeting: 'Salom!',
      body: 'Sizning hisobingizdan parolni tiklash so\'rovi kelib tushdi. Parolni yangilash uchun quyidagi tasdiqlash kodini kiriting:',
      expiry: 'Bu kod 10 daqiqa davomida amal qiladi.',
      ignore: 'Agar siz parolni tiklashni so\'ramagan bo\'lsangiz, xabarni e\'tiborsiz qoldiring. Hisobingiz xavfsiz holatda.',
      footer: 'HR Lodex — Intellektual ish qidirish platformasi',
    },
  },
  ru: {
    verification: {
      subject: 'Ваш код подтверждения - HR Lodex',
      greeting: 'Здравствуйте!',
      body: 'Спасибо за регистрацию на платформе HR Lodex. Для активации вашего аккаунта введите следующий код подтверждения:',
      expiry: 'Этот код действителен в течение 10 минут.',
      ignore: 'Если вы не отправляли запрос на регистрацию, просто проигнорируйте это письмо.',
      footer: 'HR Lodex — Интеллектуальная платформа поиска работы',
    },
    resetPassword: {
      subject: 'Код восстановления пароля - HR Lodex',
      greeting: 'Здравствуйте!',
      body: 'Получен запрос на восстановление пароля вашего аккаунта. Для обновления пароля введите следующий код:',
      expiry: 'Этот код действителен в течение 10 минут.',
      ignore: 'Если вы не запрашивали восстановление пароля, проигнорируйте это письмо. Ваш аккаунт в безопасности.',
      footer: 'HR Lodex — Интеллектуальная платформа поиска работы',
    },
  },
  en: {
    verification: {
      subject: 'Your Verification Code - HR Lodex',
      greeting: 'Hello!',
      body: 'Thank you for registering on HR Lodex. Please use the verification code below to activate your account:',
      expiry: 'This code is valid for 10 minutes.',
      ignore: 'If you did not request this registration, please ignore this email.',
      footer: 'HR Lodex — Intelligent Job Search Platform',
    },
    resetPassword: {
      subject: 'Password Reset Code - HR Lodex',
      greeting: 'Hello!',
      body: 'A password reset request was received for your account. Please enter the following code to reset your password:',
      expiry: 'This code is valid for 10 minutes.',
      ignore: 'If you did not request a password reset, you can safely ignore this email.',
      footer: 'HR Lodex — Intelligent Job Search Platform',
    },
  },
};

function getEmailTemplate(language = 'uz', type = 'verification') {
  const lang = language === 'ru' ? 'ru' : (language === 'en' ? 'en' : 'uz');
  return emailTemplates[lang][type] || emailTemplates.uz[type];
}

function generateEmailHTML(template, code) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${template.subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr>
          <td align="center">
            <!-- Logo block -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; margin-bottom: 24px;">
              <tr>
                <td align="center">
                  <div style="font-size: 24px; font-weight: 900; color: #4f46e5; letter-spacing: -0.025em; text-transform: uppercase;">
                    HR <span style="color: #0f172a; font-weight: 700;">LODEX</span>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Main Card -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
              <!-- Top Accent Bar -->
              <tr>
                <td style="background-color: #4f46e5; height: 6px;"></td>
              </tr>
              <!-- Body Content -->
              <tr>
                <td style="padding: 40px 32px; text-align: left;">
                  <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                    ${template.greeting}
                  </h2>
                  <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                    ${template.body}
                  </p>
                  
                  <!-- Verification Code Box -->
                  <div style="margin: 32px 0; text-align: center;">
                    <div style="display: inline-block; background-color: #f5f3ff; border: 2px dashed #818cf8; border-radius: 16px; padding: 18px 36px;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; color: #4f46e5; letter-spacing: 6px; line-height: 1;">
                        ${code}
                      </span>
                    </div>
                  </div>

                  <p style="margin: 24px 0 0 0; font-size: 13px; color: #4f46e5; line-height: 1.5; background-color: #f5f3ff; border-radius: 12px; padding: 12px 16px; border-left: 3px solid #818cf8; font-weight: 500;">
                    💡 Eslatma: ${template.expiry}
                  </p>
                  
                  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9;">
                    <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                      ${template.ignore}
                    </p>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; margin-top: 24px; text-align: center;">
              <tr>
                <td>
                  <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                    &copy; 2026 HR Lodex. Barcha huquqlar himoyalangan.
                  </p>
                  <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: 500;">
                    ${template.footer}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export {
  emailTemplates,
  getEmailTemplate,
  generateEmailHTML,
};
