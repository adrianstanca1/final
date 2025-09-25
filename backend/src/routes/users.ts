import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { db } from '../database/connection';
import { wrapError } from '../utils/errorHandling';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Validation schemas
const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    role: z.enum(['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'FOREMAN', 'WORKER', 'CLIENT']).optional(),
    isActive: z.boolean().optional(),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  }),
});

const userParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// GET /api/users - List users
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { companyId, role } = req.user!;
    const { role: filterRole, search, page = '1', limit = '20', active } = req.query;

    // Check permissions - only certain roles can list users
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to list users' });
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const whereClause: any = { companyId };

    if (filterRole) {
      whereClause.role = filterRole;
    }

    if (active !== undefined) {
      whereClause.isActive = active === 'true';
    }

    const users = await db.user.findMany({
      where: {
        ...whereClause,
        ...(search && {
          OR: [
            { firstName: { contains: search as string, mode: 'insensitive' } },
            { lastName: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            assignedTasks: true,
            timeEntries: true,
          },
        },
      },
      skip: offset,
      take: limitNum,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = await db.user.count({
      where: {
        ...whereClause,
        ...(search && {
          OR: [
            { firstName: { contains: search as string, mode: 'insensitive' } },
            { lastName: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
      },
    });

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching users:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/me - Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { id } = req.user!;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        company: {
          select: {
            id: true,
            name: true,
            settings: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Error fetching user profile:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// GET /api/users/:id - Get user details
router.get('/:id', authenticateToken, validateRequest(userParamsSchema), async (req, res) => {
  try {
    const { companyId, role: userRole } = req.user!;
    const { id } = req.params;

    // Check permissions
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to view user details' });
    }

    const user = await db.user.findFirst({
      where: {
        id,
        companyId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        assignedTasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          where: {
            status: {
              not: 'COMPLETED',
            },
          },
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
        },
        managedProjects: {
          select: {
            id: true,
            name: true,
            status: true,
          },
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            assignedTasks: true,
            timeEntries: true,
            managedProjects: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Error fetching user:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/users/me - Update current user profile
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { id } = req.user!;
    const { firstName, lastName, phone } = req.body;

    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    logger.info(`User profile updated: ${user.id}`);
    res.json(user);
  } catch (error) {
    logger.error('Error updating user profile:', wrapError(error));
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', authenticateToken, validateRequest(updateUserSchema), async (req, res) => {
  try {
    const { companyId, role: userRole, id: currentUserId } = req.user!;
    const { id } = req.params;

    // Check permissions - only owners and admins can update other users
    if (!['OWNER', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to update users' });
    }

    // Check if user exists and belongs to user's company
    const existingUser = await db.user.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent users from changing their own role or status
    if (id === currentUserId) {
      return res.status(400).json({ error: 'Cannot modify your own role or status' });
    }

    const updateData: any = {};
    const { firstName, lastName, email, phone, role, isActive } = req.body;

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Only owners can change user roles
    if (role !== undefined) {
      if (userRole !== 'OWNER') {
        return res.status(403).json({ error: 'Only company owners can change user roles' });
      }
      updateData.role = role;
    }

    // Check if email is being changed and if it's already in use
    if (email !== undefined && email !== existingUser.email) {
      const emailExists = await db.user.findFirst({
        where: {
          email,
          id: { not: id },
        },
      });

      if (emailExists) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      updateData.email = email;
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    logger.info(`User updated: ${user.id} by user ${currentUserId}`);
    res.json(user);
  } catch (error) {
    logger.error('Error updating user:', wrapError(error));
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// POST /api/users/me/change-password - Change password
router.post('/me/change-password', authenticateToken, validateRequest(changePasswordSchema), async (req, res) => {
  try {
    const { id } = req.user!;
    const { currentPassword, newPassword } = req.body;

    // Get user with password hash
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await db.user.update({
      where: { id },
      data: {
        password: hashedNewPassword,
      },
    });

    logger.info(`Password changed for user: ${id}`);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Error changing password:', wrapError(error));
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// DELETE /api/users/:id - Deactivate user (soft delete)
router.delete('/:id', authenticateToken, validateRequest(userParamsSchema), async (req, res) => {
  try {
    const { companyId, role: userRole, id: currentUserId } = req.user!;
    const { id } = req.params;

    // Only owners and admins can deactivate users
    if (!['OWNER', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to deactivate users' });
    }

    // Check if user exists and belongs to user's company
    const existingUser = await db.user.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent users from deactivating themselves
    if (id === currentUserId) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    // Soft delete by setting isActive to false
    await db.user.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    logger.info(`User deactivated: ${id} by user ${currentUserId}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deactivating user:', wrapError(error));
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// GET /api/users/:id/activity - Get user activity summary
router.get('/:id/activity', authenticateToken, validateRequest(userParamsSchema), async (req, res) => {
  try {
    const { companyId, role: userRole } = req.user!;
    const { id } = req.params;

    // Check permissions
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to view user activity' });
    }

    // Check if user exists and belongs to user's company
    const user = await db.user.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get activity statistics
    const today = new Date();
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalTasks,
      completedTasks,
      activeTasks,
      thisWeekTimeEntries,
      thisMonthTimeEntries,
      recentActivity
    ] = await Promise.all([
      db.task.count({
        where: { assignedToId: id },
      }),
      db.task.count({
        where: { 
          assignedToId: id,
          status: 'COMPLETED',
        },
      }),
      db.task.count({
        where: { 
          assignedToId: id,
          status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW'] },
        },
      }),
      db.timeEntry.findMany({
        where: {
          userId: id,
          startTime: { gte: thisWeek },
          endTime: { not: null },
        },
        select: {
          startTime: true,
          endTime: true,
        },
      }),
      db.timeEntry.findMany({
        where: {
          userId: id,
          startTime: { gte: thisMonth },
          endTime: { not: null },
        },
        select: {
          startTime: true,
          endTime: true,
        },
      }),
      db.timeEntry.findMany({
        where: {
          userId: id,
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          startTime: 'desc',
        },
        take: 10,
      })
    ]);

    // Calculate time totals
    const weeklyHours = thisWeekTimeEntries.reduce((sum, entry) => {
      if (entry.endTime) {
        const duration = (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60);
        return sum + duration;
      }
      return sum;
    }, 0);

    const monthlyHours = thisMonthTimeEntries.reduce((sum, entry) => {
      if (entry.endTime) {
        const duration = (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60);
        return sum + duration;
      }
      return sum;
    }, 0);

    const activity = {
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        active: activeTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      timeTracking: {
        weeklyHours: Math.round(weeklyHours * 100) / 100,
        monthlyHours: Math.round(monthlyHours * 100) / 100,
        averageDailyHours: Math.round((weeklyHours / 7) * 100) / 100,
      },
      recentActivity,
    };

    res.json(activity);
  } catch (error) {
    logger.error('Error fetching user activity:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

export default router;