type LogMeta = Record<string, unknown>;

function timestamp(): string {
  return new Date().toISOString();
}

function formatMeta(meta?: LogMeta): string {
  if (!meta || typeof meta !== 'object') return '';
  const entries = Object.entries(meta)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([key, value]) =>
        `${key}=${typeof value === 'object' ? JSON.stringify(value) : String(value)}`
    );
  return entries.length ? ` | ${entries.join(' ')}` : '';
}

function log(level: string, message: string, meta?: LogMeta): void {
  const line = `[${timestamp()}] [${level}] ${message}${formatMeta(meta)}`;
  if (level === 'ERROR') {
    console.error(line);
    return;
  }
  if (level === 'WARN') {
    console.warn(line);
    return;
  }
  console.log(line);
}

const logger = {
  info: (message: string, meta?: LogMeta) => log('INFO', message, meta),
  warn: (message: string, meta?: LogMeta) => log('WARN', message, meta),
  error: (message: string, meta?: LogMeta) => log('ERROR', message, meta),
  debug: (message: string, meta?: LogMeta) => {
    if (String(process.env.LOG_DEBUG || 'false').toLowerCase() === 'true') {
      log('DEBUG', message, meta);
    }
  },
};

export default logger;
