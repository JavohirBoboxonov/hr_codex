import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import jobRoutes from './routes/jobRoutes';
import applicationRoutes from './routes/applicationRoutes';
import sessionRoutes from './routes/sessionRoutes';
import chatRoutes from './routes/chatRoutes';
import publicRoutes from './routes/publicRoutes';
import tariffRoutes from './routes/tariffRoutes';
import paymentRoutes from './routes/paymentRoutes';
import profileRoutes from './routes/profileRoutes';
import partnerRoutes from './routes/partnerRoutes';
import { seedDefaultTariffs } from './config/seedTariffs';
import requestLogger from './middlewares/requestLogger';
import logger from './utils/logger';

const app = express();
const PORT = process.env.PORT || 5001;

connectDB();

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

seedDefaultTariffs().catch((error) => {
  logger.error('Default tariffs seeding failed', { error: error.message });
});

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tariffs', tariffRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/partner', partnerRoutes);

const statusHandler = (req, res) => {
  res.json({
    success: true,
    message: 'HR Lodex Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      jobs: '/api/jobs',
      applications: '/api/applications',
      sessions: '/api/sessions',
      chat: '/api/chat',
      public: '/api/public',
      tariffs: '/api/tariffs',
      payments: '/api/payments',
      profile: '/api/profile',
    },
  });
};

app.get(['/api', '/api/'], statusHandler);
app.get('/', statusHandler);

app.listen(PORT, () => {
  logger.info(`Server ${PORT} portda ishlayapti`);
});

process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  logger.error('Unhandled promise rejection', { reason: message });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error?.message, stack: error?.stack });
});
