import { Router } from 'express';
import { healthCheck } from '../services/db.js';

const router = Router();

router.get('/health', async (_req, res) => {
  const database = await healthCheck();
  return res.json({
    status: database ? 'ok' : 'degraded',
    database
  });
});

export default router;
