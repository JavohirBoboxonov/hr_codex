// Basic auth guard for Payme merchant callbacks
export default function paymeWebhookAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  if (!header.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Payme"');
    return res.status(401).json({ error: { code: -32504, message: { en: 'Authentication failed' } } });
  }

  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const [login, password] = decoded.split(':');
  if (login !== 'Paycom' || password !== process.env.PAYME_KEY) {
    res.set('WWW-Authenticate', 'Basic realm="Payme"');
    return res.status(401).json({ error: { code: -32504, message: { en: 'Authentication failed' } } });
  }

  return next();
};
