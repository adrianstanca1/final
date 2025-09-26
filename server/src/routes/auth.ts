import { Router } from 'express';
import bcrypt from 'bcrypt';
import { authenticate, refreshTokens, revokeRefreshToken } from '../services/auth.js';
import { pool } from '../services/db.js';
import { authenticateUser, type AuthenticatedRequest } from '../middleware/authenticate.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { tenant, email, password } = req.body ?? {};
  if (!tenant || !email || !password) {
    return res.status(400).json({ message: 'tenant, email and password are required' });
  }

  try {
    const { user, tokens } = await authenticate(tenant, email, password);
    return res.json({
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      },
      tokens
    });
  } catch (error) {
    return res.status(401).json({ message: (error as Error).message });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) {
    return res.status(400).json({ message: 'refreshToken required' });
  }

  try {
    const payload = JSON.parse(Buffer.from(refreshToken.split('.')[1], 'base64url').toString());
    const tokens = await refreshTokens(Number(payload.sub), refreshToken);
    return res.json(tokens);
  } catch (error) {
    return res.status(401).json({ message: (error as Error).message });
  }
});

router.post('/logout', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const { refreshToken } = req.body ?? {};
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  return res.status(204).send();
});

router.post('/change-password', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Both currentPassword and newPassword are required' });
  }

  const [rows] = await pool.query<{ password_hash: string }[]>(`SELECT password_hash FROM users WHERE id = ?`, [req.user?.sub]);
  const user = rows[0];
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const matches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!matches) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }

  const nextHash = await bcrypt.hash(newPassword, 12);
  await pool.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [nextHash, req.user?.sub]);
  return res.status(204).send();
});

export default router;
