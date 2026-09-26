import nodemailer from 'nodemailer';
import { getEmailTemplate, generateEmailHTML } from '../utils/emailTemplates';

let transporter;

function getSmtpConfig() {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const envPort = Number(process.env.EMAIL_PORT);
  const secureFromEnv = process.env.EMAIL_SECURE === 'true';
  const port = Number.isFinite(envPort) && envPort > 0
    ? envPort
    : (secureFromEnv ? 465 : 587);
  const secure = process.env.EMAIL_SECURE
    ? secureFromEnv
    : port === 465;

  return {
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT || 15000),
    greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT || 15000),
    socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT || 30000),
  };
}

// Development: Ethereal test pochta (hech qanday sozlash kerak emas)
// .env da EMAIL_USE_ETHEREAL=true yozing yoki EMAIL_USER/EMAIL_PASS bo'sh qoldiring
async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.EMAIL_USE_ETHEREAL === 'true' || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('Ethereal test pochta ishlatilmoqda. Kodlar haqiqiy emailga yuborilmaydi.');
    console.log('Preview: https://ethereal.email');
    return transporter;
  }

  const smtpConfig = getSmtpConfig();
  transporter = nodemailer.createTransport(smtpConfig);
  console.log('SMTP configured', {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    hasUser: !!smtpConfig.auth.user,
    hasPass: !!smtpConfig.auth.pass,
  });

  try {
    await transporter.verify();
    console.log('SMTP verify successful');
  } catch (error) {
    console.error('SMTP verify failed', {
      code: error?.code,
      message: error?.message,
    });
  }

  return transporter;
}

const sendVerificationEmail = async (email, code, language = 'uz', type = 'verification') => {
  try {
    const transport = await getTransporter();
    const fromEmail = process.env.EMAIL_USER || 'noreply@hrlodex.com';
    const template = getEmailTemplate(language, type);
    
    const mailOptions = {
      from: `"HR Lodex" <${fromEmail}>`,
      to: email,
      subject: template.subject,
      html: generateEmailHTML(template, code),
    };

    const info = await transport.sendMail(mailOptions);
    // Ethereal rejimida - console da preview link
    if (process.env.EMAIL_USE_ETHEREAL === 'true' || !process.env.EMAIL_USER) {
      console.log('Email yuborildi:', nodemailer.getTestMessageUrl(info));
    }
  } catch (error: any) {
    console.warn(`[DEV FALLBACK] Email yuborishda xatolik yuz berdi. Tasdiqlash kodi: ${code}. Xato xabari:`, error.message);
  }
};

export { transporter, sendVerificationEmail };
