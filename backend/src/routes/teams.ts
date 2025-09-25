import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { db } from '../database/connection';
import { wrapError } from '../utils/errorHandling';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    projectId: z.string().uuid(),
    leaderId: z.string().uuid().optional(),
  }),
});

const updateTeamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    leaderId: z.string().uuid().optional(),
  }),
});

const addTeamMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    userId: z.string().uuid(),
    role: z.enum(['LEADER', 'MEMBER']).default('MEMBER'),
  }),
});

const teamParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// GET /api/teams - List teams
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { companyId, role } = req.user!;
    const { projectId, search, page = '1', limit = '20' } = req.query;

    // Check permissions
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'FOREMAN'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to list teams' });
    }

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

    const teams = await db.projectTeam.findMany({
      where: {
        ...whereClause,
        ...(search && {
          OR: [
            { 
              user: {
                OR: [
                  { firstName: { contains: search as string, mode: 'insensitive' } },
                  { lastName: { contains: search as string, mode: 'insensitive' } },
                  { email: { contains: search as string, mode: 'insensitive' } },
                ],
              },
            },
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
      skip: offset,
      take: limitNum,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = await db.projectTeam.count({
      where: {
        ...whereClause,
        ...(search && {
          OR: [
            { 
              user: {
                OR: [
                  { firstName: { contains: search as string, mode: 'insensitive' } },
                  { lastName: { contains: search as string, mode: 'insensitive' } },
                  { email: { contains: search as string, mode: 'insensitive' } },
                ],
              },
            },
          ],
        }),
      },
    });

    // Group teams by project
    const teamsByProject = teams.reduce((acc, team) => {
      const projectId = team.project.id;
      if (!acc[projectId]) {
        acc[projectId] = {
          project: team.project,
          members: [],
        };
      }
      acc[projectId].members.push({
        id: team.id,
        role: team.role,
        joinedAt: team.createdAt,
        user: team.user,
      });
      return acc;
    }, {} as Record<string, any>);

    res.json({
      teams: Object.values(teamsByProject),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching teams:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// GET /api/teams/project/:projectId - Get team for specific project
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { companyId, role } = req.user!;
    const { projectId } = req.params;

    // Check permissions
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'FOREMAN'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to view teams' });
    }

    // Verify project belongs to user's company
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const teamMembers = await db.projectTeam.findMany({
      where: {
        projectId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // Leaders first
        { createdAt: 'asc' },
      ],
    });

    // Get team statistics
    const teamStats = {
      totalMembers: teamMembers.length,
      leaders: teamMembers.filter(member => member.role === 'LEADER').length,
      members: teamMembers.filter(member => member.role === 'MEMBER').length,
    };

    res.json({
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
      },
      team: teamMembers.map(member => ({
        id: member.id,
        role: member.role,
        joinedAt: member.createdAt,
        user: member.user,
      })),
      stats: teamStats,
    });
  } catch (error) {
    logger.error('Error fetching project team:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch project team' });
  }
});

// POST /api/teams/project/:projectId/members - Add member to project team
router.post('/project/:projectId/members', authenticateToken, async (req, res) => {
  try {
    const { companyId, role, id: currentUserId } = req.user!;
    const { projectId } = req.params;
    const { userId, role: memberRole = 'MEMBER' } = req.body;

    // Check permissions
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to manage teams' });
    }

    // Verify project belongs to user's company
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user belongs to the same company
    const user = await db.user.findFirst({
      where: {
        id: userId,
        companyId,
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid user selected' });
    }

    // Check if user is already a team member
    const existingMember = await db.projectTeam.findFirst({
      where: {
        projectId,
        userId,
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a team member' });
    }

    const teamMember = await db.projectTeam.create({
      data: {
        projectId,
        userId,
        role: memberRole,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info(`Team member added to project: ${projectId}, user: ${userId} by ${currentUserId}`);
    res.status(201).json({
      id: teamMember.id,
      role: teamMember.role,
      joinedAt: teamMember.createdAt,
      user: teamMember.user,
      project: teamMember.project,
    });
  } catch (error) {
    logger.error('Error adding team member:', wrapError(error));
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// PUT /api/teams/:id - Update team member role
router.put('/:id', authenticateToken, validateRequest(updateTeamSchema), async (req, res) => {
  try {
    const { companyId, role, id: currentUserId } = req.user!;
    const { id } = req.params;
    const { role: memberRole } = req.body;

    // Check permissions
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to update team members' });
    }

    // Check if team member exists and belongs to user's company
    const existingMember = await db.projectTeam.findFirst({
      where: {
        id,
        project: {
          companyId,
        },
      },
      include: {
        project: true,
        user: true,
      },
    });

    if (!existingMember) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    const updatedMember = await db.projectTeam.update({
      where: { id },
      data: {
        role: memberRole,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info(`Team member role updated: ${id} by user ${currentUserId}`);
    res.json({
      id: updatedMember.id,
      role: updatedMember.role,
      joinedAt: updatedMember.createdAt,
      user: updatedMember.user,
      project: updatedMember.project,
    });
  } catch (error) {
    logger.error('Error updating team member:', wrapError(error));
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

// DELETE /api/teams/:id - Remove team member
router.delete('/:id', authenticateToken, validateRequest(teamParamsSchema), async (req, res) => {
  try {
    const { companyId, role, id: currentUserId } = req.user!;
    const { id } = req.params;

    // Check permissions
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to remove team members' });
    }

    // Check if team member exists and belongs to user's company
    const existingMember = await db.projectTeam.findFirst({
      where: {
        id,
        project: {
          companyId,
        },
      },
    });

    if (!existingMember) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    await db.projectTeam.delete({
      where: { id },
    });

    logger.info(`Team member removed: ${id} by user ${currentUserId}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error removing team member:', wrapError(error));
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

// GET /api/teams/user/:userId/projects - Get projects where user is a team member
router.get('/user/:userId/projects', authenticateToken, async (req, res) => {
  try {
    const { companyId, role, id: currentUserId } = req.user!;
    const { userId } = req.params;

    // Check permissions - users can only see their own projects, managers can see all
    if (userId !== currentUserId && !['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to view user projects' });
    }

    // Verify user belongs to the same company
    const user = await db.user.findFirst({
      where: {
        id: userId,
        companyId,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userProjects = await db.projectTeam.findMany({
      where: {
        userId,
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
            priority: true,
            startDate: true,
            endDate: true,
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const projects = userProjects.map(teamMember => ({
      teamMemberId: teamMember.id,
      role: teamMember.role,
      joinedAt: teamMember.createdAt,
      project: teamMember.project,
    }));

    res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      projects,
      stats: {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.project.status === 'IN_PROGRESS').length,
        leadingProjects: projects.filter(p => p.role === 'LEADER').length,
      },
    });
  } catch (error) {
    logger.error('Error fetching user projects:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch user projects' });
  }
});

export default router;