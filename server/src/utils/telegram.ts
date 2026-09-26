import axios from 'axios';

/**
 * Telegram bot orqali xabar yuborish
 * @param {string} text - Xabar matni (HTML formatda bo'lishi mumkin)
 */
const sendTelegramMessage = async (text) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID .env faylida o\'rnatilmagan');
    return;
  }

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Telegramga xabar yuborishda xatolik:', error.response?.data || error.message);
  }
};

export { sendTelegramMessage };
