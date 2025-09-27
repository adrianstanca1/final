import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs/promises';
import { env } from './utils/env.js';
import { logger } from './utils/logger.js';
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import projectRoutes from './routes/projects.js';
import invoiceRoutes from './routes/invoices.js';
import systemRoutes from './routes/system.js';
import taskRoutes from './routes/tasks.js';
import companyRoutes from './routes/companies.js';
import expenseRoutes from './routes/expenses.js';
import { authenticateUser } from './middleware/authenticate.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/expenses', expenseRoutes);

app.get('/api/me', authenticateUser, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthenticated' });
  }

  return res.json({ user: req.user });
});

app.use('/docs', express.static(env.uploadRoot));

async function bootstrap() {
  await fs.mkdir(env.uploadRoot, { recursive: true });
  const port = Number(process.env.PORT ?? 4000);
  app.listen(port, () => logger.info(`API listening on :${port}`));
}

bootstrap().catch((error) => {
  logger.error({ error }, 'Failed to start API');
  process.exit(1);
});
