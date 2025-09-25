import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { db } from '../database/connection';
import { wrapError } from '../utils/errorHandling';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    projectId: z.string().uuid(),
    assignedToId: z.string().uuid().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']).default('TODO'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    dueDate: z.string().datetime().optional(),
    estimatedHours: z.number().positive().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    assignedToId: z.string().uuid().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    dueDate: z.string().datetime().optional(),
    estimatedHours: z.number().positive().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const taskParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// GET /api/tasks - List tasks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { companyId, id: userId, role } = req.user!;
    const { 
      projectId, 
      assignedToId, 
      status, 
      priority, 
      search, 
      page = '1', 
      limit = '20',
      myTasks
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const whereClause: any = {
      project: {
        companyId,
      },
    };

    if (projectId) {
      whereClause.projectId = projectId;
    }

    if (assignedToId) {
      whereClause.assignedToId = assignedToId;
    }

    if (myTasks === 'true') {
      whereClause.assignedToId = userId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (priority) {
      whereClause.priority = priority;
    }

    const tasks = await db.task.findMany({
      where: {
        ...whereClause,
        ...(search && {
          OR: [
            { title: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
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

    const total = await db.task.count({
      where: {
        ...whereClause,
        ...(search && {
          OR: [
            { title: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
      },
    });

    res.json({
      tasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching tasks:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/:id - Get task details
router.get('/:id', authenticateToken, validateRequest(taskParamsSchema), async (req, res) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;

    const task = await db.task.findFirst({
      where: {
        id,
        project: {
          companyId,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        timeEntries: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            startTime: 'desc',
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Calculate time tracking statistics
    const totalHours = task.timeEntries.reduce((sum, entry) => {
      const duration = entry.endTime 
        ? (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60)
        : 0;
      return sum + duration;
    }, 0);

    const taskWithStats = {
      ...task,
      stats: {
        totalHours: Math.round(totalHours * 100) / 100,
        estimatedHours: task.estimatedHours || 0,
        remainingHours: task.estimatedHours ? Math.max(0, task.estimatedHours - totalHours) : 0,
        isOverEstimate: task.estimatedHours ? totalHours > task.estimatedHours : false,
      },
    };

    res.json(taskWithStats);
  } catch (error) {
    logger.error('Error fetching task:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// POST /api/tasks - Create new task
router.post('/', authenticateToken, validateRequest(createTaskSchema), async (req, res) => {
  try {
    const { companyId, id: userId } = req.user!;
    const { 
      title, 
      description, 
      projectId, 
      assignedToId, 
      status, 
      priority, 
      dueDate, 
      estimatedHours,
      tags 
    } = req.body;

    // Validate project belongs to the same company
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(400).json({ error: 'Invalid project selected' });
    }

    // Validate assignee belongs to the same company
    if (assignedToId) {
      const assignee = await db.user.findFirst({
        where: {
          id: assignedToId,
          companyId,
        },
      });

      if (!assignee) {
        return res.status(400).json({ error: 'Invalid assignee selected' });
      }
    }

    const task = await db.task.create({
      data: {
        title,
        description,
        projectId,
        assignedToId,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours,
        tags: tags || [],
        createdById: userId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(`Task created: ${task.id} by user ${userId}`);
    res.status(201).json(task);
  } catch (error) {
    logger.error('Error creating task:', wrapError(error));
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', authenticateToken, validateRequest(updateTaskSchema), async (req, res) => {
  try {
    const { companyId, id: userId } = req.user!;
    const { id } = req.params;

    // Check if task exists and belongs to user's company
    const existingTask = await db.task.findFirst({
      where: {
        id,
        project: {
          companyId,
        },
      },
      include: {
        project: true,
      },
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updateData: any = {};
    const { 
      title, 
      description, 
      assignedToId, 
      status, 
      priority, 
      dueDate, 
      estimatedHours,
      tags 
    } = req.body;

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
    if (tags !== undefined) updateData.tags = tags;

    // Validate assignee if provided
    if (assignedToId !== undefined) {
      if (assignedToId) {
        const assignee = await db.user.findFirst({
          where: {
            id: assignedToId,
            companyId,
          },
        });

        if (!assignee) {
          return res.status(400).json({ error: 'Invalid assignee selected' });
        }
      }
      updateData.assignedToId = assignedToId;
    }

    const task = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(`Task updated: ${task.id} by user ${userId}`);
    res.json(task);
  } catch (error) {
    logger.error('Error updating task:', wrapError(error));
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', authenticateToken, validateRequest(taskParamsSchema), async (req, res) => {
  try {
    const { companyId, id: userId } = req.user!;
    const { id } = req.params;

    // Check if task exists and belongs to user's company
    const existingTask = await db.task.findFirst({
      where: {
        id,
        project: {
          companyId,
        },
      },
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await db.task.delete({
      where: { id },
    });

    logger.info(`Task deleted: ${id} by user ${userId}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting task:', wrapError(error));
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// POST /api/tasks/:id/time - Start/stop time tracking
router.post('/:id/time', authenticateToken, async (req, res) => {
  try {
    const { companyId, id: userId } = req.user!;
    const { id: taskId } = req.params;
    const { action, notes } = req.body; // action: 'start' or 'stop'

    // Check if task exists and belongs to user's company
    const existingTask = await db.task.findFirst({
      where: {
        id: taskId,
        project: {
          companyId,
        },
      },
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (action === 'start') {
      // Check if user has any active time entries
      const activeEntry = await db.timeEntry.findFirst({
        where: {
          userId,
          endTime: null,
        },
      });

      if (activeEntry) {
        return res.status(400).json({ error: 'You already have an active time entry. Please stop it first.' });
      }

      const timeEntry = await db.timeEntry.create({
        data: {
          taskId,
          userId,
          startTime: new Date(),
          notes,
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      res.json(timeEntry);
    } else if (action === 'stop') {
      // Find active time entry for this task and user
      const activeEntry = await db.timeEntry.findFirst({
        where: {
          taskId,
          userId,
          endTime: null,
        },
      });

      if (!activeEntry) {
        return res.status(400).json({ error: 'No active time entry found for this task' });
      }

      const timeEntry = await db.timeEntry.update({
        where: { id: activeEntry.id },
        data: {
          endTime: new Date(),
          notes: notes || activeEntry.notes,
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      res.json(timeEntry);
    } else {
      return res.status(400).json({ error: 'Invalid action. Must be "start" or "stop"' });
    }
  } catch (error) {
    logger.error('Error managing time tracking:', wrapError(error));
    res.status(500).json({ error: 'Failed to manage time tracking' });
  }
});

export default router;