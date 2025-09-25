import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { db } from '../database/connection';
import { wrapError } from '../utils/errorHandling';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    address: z.string().min(1).max(500),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    budget: z.number().positive().optional(),
    status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    clientId: z.string().uuid().optional(),
  }),
});

const updateProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    address: z.string().min(1).max(500).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    budget: z.number().positive().optional(),
    status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    clientId: z.string().uuid().optional(),
  }),
});

const projectParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// GET /api/projects - List projects
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { companyId, role } = req.user!;
    const { status, priority, search, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const whereClause: any = { companyId };

    if (status) {
      whereClause.status = status;
    }

    if (priority) {
      whereClause.priority = priority;
    }

    const projects = await db.project.findMany({
      where: {
        ...whereClause,
        ...(search && {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } },
            { address: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            team: true,
            safetyIncidents: true,
          },
        },
      },
      skip: offset,
      take: limitNum,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = await db.project.count({
      where: {
        ...whereClause,
        ...(search && {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } },
            { address: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
      },
    });

    res.json({
      projects,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching projects:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id - Get project details
router.get('/:id', authenticateToken, validateRequest(projectParamsSchema), async (req, res) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;

    const project = await db.project.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        client: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        team: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
        tasks: {
          include: {
            assignedTo: {
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
        },
        equipment: true,
        documents: true,
        safetyIncidents: {
          where: {
            severity: 'HIGH',
          },
          take: 5,
          orderBy: {
            incidentDate: 'desc',
          },
        },
        expenses: {
          take: 10,
          orderBy: {
            date: 'desc',
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Calculate project statistics
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(task => task.status === 'COMPLETED').length;
    const totalBudget = project.budget || 0;
    const totalExpenses = project.expenses.reduce((sum, expense) => sum + expense.amount, 0);

    const projectWithStats = {
      ...project,
      stats: {
        totalTasks,
        completedTasks,
        completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        totalBudget,
        totalExpenses,
        remainingBudget: totalBudget - totalExpenses,
        budgetUtilization: totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0,
      },
    };

    res.json(projectWithStats);
  } catch (error) {
    logger.error('Error fetching project:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/projects - Create new project
router.post('/', authenticateToken, validateRequest(createProjectSchema), async (req, res) => {
  try {
    const { companyId, id: userId, role } = req.user!;
    
    // Check permissions
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to create projects' });
    }

    const { name, description, address, startDate, endDate, budget, status, priority, clientId } = req.body;

    // Validate client belongs to the same company
    if (clientId) {
      const client = await db.client.findFirst({
        where: {
          id: clientId,
          companyId,
        },
      });

      if (!client) {
        return res.status(400).json({ error: 'Invalid client selected' });
      }
    }

    const project = await db.project.create({
      data: {
        name,
        description,
        address,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        budget,
        status,
        priority,
        companyId,
        managerId: userId, // Set creator as initial manager
        clientId,
      },
      include: {
        client: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Project created: ${project.id} by user ${userId}`);
    res.status(201).json(project);
  } catch (error) {
    logger.error('Error creating project:', wrapError(error));
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', authenticateToken, validateRequest(updateProjectSchema), async (req, res) => {
  try {
    const { companyId, id: userId, role } = req.user!;
    const { id } = req.params;

    // Check if project exists and belongs to user's company
    const existingProject = await db.project.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permissions
    if (!['OWNER', 'ADMIN'].includes(role) && existingProject.managerId !== userId) {
      return res.status(403).json({ error: 'Insufficient permissions to update this project' });
    }

    const updateData: any = {};
    const { name, description, address, startDate, endDate, budget, status, priority, clientId } = req.body;

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (budget !== undefined) updateData.budget = budget;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;

    // Validate client if provided
    if (clientId !== undefined) {
      if (clientId) {
        const client = await db.client.findFirst({
          where: {
            id: clientId,
            companyId,
          },
        });

        if (!client) {
          return res.status(400).json({ error: 'Invalid client selected' });
        }
      }
      updateData.clientId = clientId;
    }

    const project = await db.project.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Project updated: ${project.id} by user ${userId}`);
    res.json(project);
  } catch (error) {
    logger.error('Error updating project:', wrapError(error));
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', authenticateToken, validateRequest(projectParamsSchema), async (req, res) => {
  try {
    const { companyId, id: userId, role } = req.user!;
    const { id } = req.params;

    // Check if project exists and belongs to user's company
    const existingProject = await db.project.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owners and admins can delete projects
    if (!['OWNER', 'ADMIN'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to delete projects' });
    }

    await db.project.delete({
      where: { id },
    });

    logger.info(`Project deleted: ${id} by user ${userId}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting project:', wrapError(error));
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// POST /api/projects/:id/team - Add team member to project
router.post('/:id/team', authenticateToken, async (req, res) => {
  try {
    const { companyId, id: userId, role } = req.user!;
    const { id: projectId } = req.params;
    const { userId: teamMemberId, role: teamRole = 'MEMBER' } = req.body;

    // Check if project exists and belongs to user's company
    const existingProject = await db.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permissions
    if (!['OWNER', 'ADMIN'].includes(role) && existingProject.managerId !== userId) {
      return res.status(403).json({ error: 'Insufficient permissions to manage team' });
    }

    // Validate team member belongs to the same company
    const teamMember = await db.user.findFirst({
      where: {
        id: teamMemberId,
        companyId,
      },
    });

    if (!teamMember) {
      return res.status(400).json({ error: 'Invalid team member selected' });
    }

    // Check if already a team member
    const existingTeamMember = await db.projectTeam.findFirst({
      where: {
        projectId,
        userId: teamMemberId,
      },
    });

    if (existingTeamMember) {
      return res.status(400).json({ error: 'User is already a team member' });
    }

    const teamMemberRecord = await db.projectTeam.create({
      data: {
        projectId,
        userId: teamMemberId,
        role: teamRole,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    logger.info(`Team member added to project: ${projectId}, user: ${teamMemberId}`);
    res.status(201).json(teamMemberRecord);
  } catch (error) {
    logger.error('Error adding team member:', wrapError(error));
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

export default router;