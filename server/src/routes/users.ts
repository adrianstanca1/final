import { Router } from 'express';
import { authenticateUser, type AuthenticatedRequest, requireRole } from '../middleware/authenticate.js';
import { pool } from '../services/db.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import bcrypt from 'bcrypt';

interface UserRow extends RowDataPacket {
  id: number;
  tenant_id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'owner' | 'admin' | 'manager' | 'foreman' | 'worker';
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

const router = Router();

// Get all users for a tenant
router.get('/', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const [rows] = await pool.query<UserRow[]>(
      `SELECT id, tenant_id, email, first_name, last_name, role, phone, avatar_url, 
              is_active, last_login, created_at, updated_at
       FROM users 
       WHERE tenant_id = ? 
       ORDER BY first_name, last_name`,
      [req.user?.tenant_id]
    );
    
    const users = rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      phone: row.phone,
      avatarUrl: row.avatar_url,
      isActive: row.is_active,
      lastLogin: row.last_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    return res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get a specific user
router.get('/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const userId = parseInt(req.params.id);
  
  try {
    const [rows] = await pool.query<UserRow[]>(
      `SELECT id, tenant_id, email, first_name, last_name, role, phone, avatar_url, 
              is_active, last_login, created_at, updated_at
       FROM users 
       WHERE id = ? AND tenant_id = ?`,
      [userId, req.user?.tenant_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const row = rows[0];
    const user = {
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      phone: row.phone,
      avatarUrl: row.avatar_url,
      isActive: row.is_active,
      lastLogin: row.last_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    return res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Create a new user
router.post('/', authenticateUser, requireRole(['owner', 'admin']), async (req: AuthenticatedRequest, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    role = 'worker',
    phone,
    avatarUrl
  } = req.body;
  
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ 
      message: 'Email, password, firstName, and lastName are required' 
    });
  }
  
  try {
    // Check if email already exists
    const [existingUsers] = await pool.query<UserRow[]>(
      'SELECT id FROM users WHERE email = ? AND tenant_id = ?',
      [email, req.user?.tenant_id]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO users (
        tenant_id, email, password_hash, first_name, last_name, role, phone, avatar_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user?.tenant_id,
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        phone || null,
        avatarUrl || null
      ]
    );
    
    return res.status(201).json({ 
      id: result.insertId,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ message: 'Failed to create user' });
  }
});

// Update a user
router.put('/:id', authenticateUser, requireRole(['owner', 'admin']), async (req: AuthenticatedRequest, res) => {
  const userId = parseInt(req.params.id);
  const {
    email,
    firstName,
    lastName,
    role,
    phone,
    avatarUrl,
    isActive
  } = req.body;
  
  try {
    // Check if user exists and belongs to tenant
    const [existingRows] = await pool.query<UserRow[]>(
      'SELECT id FROM users WHERE id = ? AND tenant_id = ?',
      [userId, req.user?.tenant_id]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if email is taken by another user
    if (email) {
      const [emailCheck] = await pool.query<UserRow[]>(
        'SELECT id FROM users WHERE email = ? AND tenant_id = ? AND id != ?',
        [email, req.user?.tenant_id, userId]
      );
      
      if (emailCheck.length > 0) {
        return res.status(409).json({ message: 'Email already exists' });
      }
    }
    
    await pool.execute(
      `UPDATE users SET 
        email = COALESCE(?, email),
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        role = COALESCE(?, role),
        phone = ?,
        avatar_url = ?,
        is_active = COALESCE(?, is_active),
        updated_at = NOW()
       WHERE id = ? AND tenant_id = ?`,
      [
        email,
        firstName,
        lastName,
        role,
        phone,
        avatarUrl,
        isActive,
        userId,
        req.user?.tenant_id
      ]
    );
    
    return res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Failed to update user' });
  }
});

// Update user password
router.patch('/:id/password', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const userId = parseInt(req.params.id);
  const { currentPassword, newPassword } = req.body;
  
  // Users can only change their own password unless they're admin/owner
  const isOwnPassword = userId === req.user?.sub;
  const isAdmin = req.user?.role === 'owner' || req.user?.role === 'admin';
  
  if (!isOwnPassword && !isAdmin) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  
  if (!newPassword) {
    return res.status(400).json({ message: 'New password is required' });
  }
  
  // If changing own password, current password is required
  if (isOwnPassword && !currentPassword) {
    return res.status(400).json({ message: 'Current password is required' });
  }
  
  try {
    // Get current password hash
    const [rows] = await pool.query<UserRow[]>(
      'SELECT password_hash FROM users WHERE id = ? AND tenant_id = ?',
      [userId, req.user?.tenant_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password if required
    if (isOwnPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    
    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?',
      [newPasswordHash, userId, req.user?.tenant_id]
    );
    
    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    return res.status(500).json({ message: 'Failed to update password' });
  }
});

// Deactivate a user (soft delete)
router.delete('/:id', authenticateUser, requireRole(['owner', 'admin']), async (req: AuthenticatedRequest, res) => {
  const userId = parseInt(req.params.id);
  
  // Prevent self-deletion
  if (userId === req.user?.sub) {
    return res.status(400).json({ message: 'Cannot deactivate your own account' });
  }
  
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = ? AND tenant_id = ?',
      [userId, req.user?.tenant_id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    return res.status(500).json({ message: 'Failed to deactivate user' });
  }
});

// Reactivate a user
router.patch('/:id/activate', authenticateUser, requireRole(['owner', 'admin']), async (req: AuthenticatedRequest, res) => {
  const userId = parseInt(req.params.id);
  
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE users SET is_active = TRUE, updated_at = NOW() WHERE id = ? AND tenant_id = ?',
      [userId, req.user?.tenant_id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.json({ message: 'User activated successfully' });
  } catch (error) {
    console.error('Error activating user:', error);
    return res.status(500).json({ message: 'Failed to activate user' });
  }
});

export default router;
