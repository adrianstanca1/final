import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { db } from '../database/connection';
import { wrapError } from '../utils/errorHandling';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const createIncidentSchema = z.object({
  body: z.object({
    projectId: z.string().uuid(),
    title: z.string().min(1).max(200),
    description: z.string().min(10).max(2000),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    incidentType: z.enum(['INJURY', 'NEAR_MISS', 'PROPERTY_DAMAGE', 'ENVIRONMENTAL', 'SECURITY', 'OTHER']),
    location: z.string().min(1).max(300),
    dateOccurred: z.string().datetime(),
    injuriesReported: z.boolean().default(false),
    witnessCount: z.number().int().nonnegative().default(0),
    immediateActions: z.string().max(1000).optional(),
    rootCause: z.string().max(1000).optional(),
    preventiveActions: z.string().max(1000).optional(),
    reportedToAuthorities: z.boolean().default(false),
    authorityReference: z.string().max(200).optional(),
    photos: z.array(z.string().url()).optional(),
  }),
});

const updateIncidentSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(10).max(2000).optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    incidentType: z.enum(['INJURY', 'NEAR_MISS', 'PROPERTY_DAMAGE', 'ENVIRONMENTAL', 'SECURITY', 'OTHER']).optional(),
    location: z.string().min(1).max(300).optional(),
    dateOccurred: z.string().datetime().optional(),
    injuriesReported: z.boolean().optional(),
    witnessCount: z.number().int().nonnegative().optional(),
    immediateActions: z.string().max(1000).optional(),
    rootCause: z.string().max(1000).optional(),
    preventiveActions: z.string().max(1000).optional(),
    reportedToAuthorities: z.boolean().optional(),
    authorityReference: z.string().max(200).optional(),
    status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']).optional(),
    photos: z.array(z.string().url()).optional(),
  }),
});

const incidentParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const createTrainingSchema = z.object({
  body: z.object({
    projectId: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    description: z.string().min(10).max(1000),
    trainingType: z.enum(['SAFETY_ORIENTATION', 'EQUIPMENT_TRAINING', 'HAZARD_AWARENESS', 'EMERGENCY_PROCEDURES', 'REGULATORY_COMPLIANCE', 'OTHER']),
    scheduledDate: z.string().datetime(),
    duration: z.number().positive(), // in minutes
    maxParticipants: z.number().int().positive().optional(),
    location: z.string().max(300),
    instructor: z.string().max(200),
    materials: z.array(z.string().url()).optional(),
    certificationProvided: z.boolean().default(false),
    mandatory: z.boolean().default(true),
  }),
});

// GET /api/safety/incidents - List safety incidents
router.get('/incidents', authenticateToken, async (req, res) => {
  try {
    const { companyId, role } = req.user!;
    const { 
      projectId, 
      severity, 
      incidentType, 
      status = 'all',
      startDate, 
      endDate, 
      search, 
      page = '1', 
      limit = '20' 
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

    if (severity) {
      whereClause.severity = severity;
    }

    if (incidentType) {
      whereClause.incidentType = incidentType;
    }

    if (status !== 'all') {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.dateOccurred = {};
      if (startDate) {
        whereClause.dateOccurred.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.dateOccurred.lte = new Date(endDate as string);
      }
    }

    const incidents = await db.safetyIncident.findMany({
      where: {
        ...whereClause,
        ...(search && {
          OR: [
            { title: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } },
            { location: { contains: search as string, mode: 'insensitive' } },
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
        reportedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      skip: offset,
      take: limitNum,
      orderBy: {
        dateOccurred: 'desc',
      },
    });

    const total = await db.safetyIncident.count({
      where: {
        ...whereClause,
        ...(search && {
          OR: [
            { title: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } },
            { location: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
      },
    });

    // Calculate summary statistics
    const severityCounts = await db.safetyIncident.groupBy({
      by: ['severity'],
      where: whereClause,
      _count: {
        severity: true,
      },
    });

    const statusCounts = await db.safetyIncident.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        status: true,
      },
    });

    res.json({
      incidents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      summary: {
        severityCounts: severityCounts.reduce((acc, item) => {
          acc[item.severity] = item._count.severity;
          return acc;
        }, {} as Record<string, number>),
        statusCounts: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    logger.error('Error fetching safety incidents:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch safety incidents' });
  }
});

// GET /api/safety/incidents/:id - Get incident details
router.get('/incidents/:id', authenticateToken, validateRequest(incidentParamsSchema), async (req, res) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;

    const incident = await db.safetyIncident.findFirst({
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
            address: true,
          },
        },
        reportedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
      },
    });

    if (!incident) {
      return res.status(404).json({ error: 'Safety incident not found' });
    }

    res.json(incident);
  } catch (error) {
    logger.error('Error fetching safety incident:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch safety incident' });
  }
});

// POST /api/safety/incidents - Create new safety incident
router.post('/incidents', authenticateToken, validateRequest(createIncidentSchema), async (req, res) => {
  try {
    const { companyId, id: userId } = req.user!;
    const { 
      projectId, 
      title, 
      description, 
      severity, 
      incidentType, 
      location, 
      dateOccurred,
      injuriesReported,
      witnessCount,
      immediateActions,
      rootCause,
      preventiveActions,
      reportedToAuthorities,
      authorityReference,
      photos
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

    const incident = await db.safetyIncident.create({
      data: {
        projectId,
        title,
        description,
        severity,
        incidentType,
        location,
        dateOccurred: new Date(dateOccurred),
        injuriesReported,
        witnessCount,
        immediateActions,
        rootCause,
        preventiveActions,
        reportedToAuthorities,
        authorityReference,
        photos,
        reportedById: userId,
        status: 'OPEN',
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        reportedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // If it's a high severity incident, auto-assign to project managers
    if (['HIGH', 'CRITICAL'].includes(severity)) {
      const projectManagers = await db.user.findMany({
        where: {
          companyId,
          role: { in: ['OWNER', 'ADMIN', 'PROJECT_MANAGER'] },
        },
        select: { id: true },
      });

      if (projectManagers.length > 0) {
        await db.safetyIncident.update({
          where: { id: incident.id },
          data: {
            assignedToId: projectManagers[0].id,
            status: 'INVESTIGATING',
          },
        });
      }
    }

    logger.info(`Safety incident created: ${incident.id} by user ${userId}`);
    res.status(201).json(incident);
  } catch (error) {
    logger.error('Error creating safety incident:', wrapError(error));
    res.status(500).json({ error: 'Failed to create safety incident' });
  }
});

// PUT /api/safety/incidents/:id - Update incident
router.put('/incidents/:id', authenticateToken, validateRequest(updateIncidentSchema), async (req, res) => {
  try {
    const { companyId, id: userId, role } = req.user!;
    const { id } = req.params;

    // Check if incident exists and belongs to user's company
    const existingIncident = await db.safetyIncident.findFirst({
      where: {
        id,
        project: {
          companyId,
        },
      },
    });

    if (!existingIncident) {
      return res.status(404).json({ error: 'Safety incident not found' });
    }

    // Check permissions - reporter or managers can edit
    if (existingIncident.reportedById !== userId && !['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to update this incident' });
    }

    const updateData: any = {};
    const { 
      title, 
      description, 
      severity, 
      incidentType, 
      location, 
      dateOccurred,
      injuriesReported,
      witnessCount,
      immediateActions,
      rootCause,
      preventiveActions,
      reportedToAuthorities,
      authorityReference,
      status,
      photos
    } = req.body;

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (severity !== undefined) updateData.severity = severity;
    if (incidentType !== undefined) updateData.incidentType = incidentType;
    if (location !== undefined) updateData.location = location;
    if (dateOccurred !== undefined) updateData.dateOccurred = new Date(dateOccurred);
    if (injuriesReported !== undefined) updateData.injuriesReported = injuriesReported;
    if (witnessCount !== undefined) updateData.witnessCount = witnessCount;
    if (immediateActions !== undefined) updateData.immediateActions = immediateActions;
    if (rootCause !== undefined) updateData.rootCause = rootCause;
    if (preventiveActions !== undefined) updateData.preventiveActions = preventiveActions;
    if (reportedToAuthorities !== undefined) updateData.reportedToAuthorities = reportedToAuthorities;
    if (authorityReference !== undefined) updateData.authorityReference = authorityReference;
    if (photos !== undefined) updateData.photos = photos;

    // Only managers can change status or assign incidents
    if (status !== undefined) {
      if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
        return res.status(403).json({ error: 'Insufficient permissions to change incident status' });
      }
      updateData.status = status;
      updateData.assignedToId = userId;
      
      if (status === 'RESOLVED' || status === 'CLOSED') {
        updateData.resolvedAt = new Date();
      }
    }

    const incident = await db.safetyIncident.update({
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
        reportedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(`Safety incident updated: ${incident.id} by user ${userId}`);
    res.json(incident);
  } catch (error) {
    logger.error('Error updating safety incident:', wrapError(error));
    res.status(500).json({ error: 'Failed to update safety incident' });
  }
});

// GET /api/safety/dashboard - Safety dashboard statistics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.user!;
    const { projectId, timeframe = '30' } = req.query;

    const days = parseInt(timeframe as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const whereClause: any = {
      project: {
        companyId,
      },
      dateOccurred: {
        gte: startDate,
      },
    };

    if (projectId) {
      whereClause.projectId = projectId;
    }

    // Get incidents grouped by severity
    const severityStats = await db.safetyIncident.groupBy({
      by: ['severity'],
      where: whereClause,
      _count: {
        severity: true,
      },
    });

    // Get incidents grouped by type
    const typeStats = await db.safetyIncident.groupBy({
      by: ['incidentType'],
      where: whereClause,
      _count: {
        incidentType: true,
      },
    });

    // Get recent incidents
    const recentIncidents = await db.safetyIncident.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        reportedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        dateOccurred: 'desc',
      },
      take: 10,
    });

    // Calculate trends
    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (days * 2));
    const previousPeriodEnd = new Date();
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - days);

    const previousPeriodCount = await db.safetyIncident.count({
      where: {
        project: {
          companyId,
        },
        dateOccurred: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd,
        },
        ...(projectId && { projectId }),
      },
    });

    const currentPeriodCount = await db.safetyIncident.count({
      where: whereClause,
    });

    const trend = previousPeriodCount === 0 ? 100 : 
      Math.round(((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100);

    // Get injury statistics
    const injuryCount = await db.safetyIncident.count({
      where: {
        ...whereClause,
        injuriesReported: true,
      },
    });

    // Days without incident
    const lastIncident = await db.safetyIncident.findFirst({
      where: {
        project: {
          companyId,
        },
        ...(projectId && { projectId }),
      },
      orderBy: {
        dateOccurred: 'desc',
      },
      select: {
        dateOccurred: true,
      },
    });

    const daysWithoutIncident = lastIncident 
      ? Math.floor((Date.now() - lastIncident.dateOccurred.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    res.json({
      overview: {
        totalIncidents: currentPeriodCount,
        injuriesReported: injuryCount,
        daysWithoutIncident,
        trend,
        timeframe: days,
      },
      severityBreakdown: severityStats.reduce((acc, item) => {
        acc[item.severity] = item._count.severity;
        return acc;
      }, {} as Record<string, number>),
      typeBreakdown: typeStats.reduce((acc, item) => {
        acc[item.incidentType] = item._count.incidentType;
        return acc;
      }, {} as Record<string, number>),
      recentIncidents: recentIncidents.map(incident => ({
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
        incidentType: incident.incidentType,
        dateOccurred: incident.dateOccurred,
        project: incident.project,
        reportedBy: `${incident.reportedBy.firstName} ${incident.reportedBy.lastName}`,
        status: incident.status,
      })),
    });
  } catch (error) {
    logger.error('Error fetching safety dashboard:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch safety dashboard' });
  }
});

// POST /api/safety/training - Create safety training session
router.post('/training', authenticateToken, validateRequest(createTrainingSchema), async (req, res) => {
  try {
    const { companyId, id: userId, role } = req.user!;

    // Check permissions
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to create training sessions' });
    }

    const { 
      projectId,
      title,
      description,
      trainingType,
      scheduledDate,
      duration,
      maxParticipants,
      location,
      instructor,
      materials,
      certificationProvided,
      mandatory
    } = req.body;

    // Validate project if provided
    if (projectId) {
      const project = await db.project.findFirst({
        where: {
          id: projectId,
          companyId,
        },
      });

      if (!project) {
        return res.status(400).json({ error: 'Invalid project selected' });
      }
    }

    const training = await db.safetyTraining.create({
      data: {
        projectId,
        title,
        description,
        trainingType,
        scheduledDate: new Date(scheduledDate),
        duration,
        maxParticipants,
        location,
        instructor,
        materials,
        certificationProvided,
        mandatory,
        createdById: userId,
        companyId,
        status: 'SCHEDULED',
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
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

    logger.info(`Safety training created: ${training.id} by user ${userId}`);
    res.status(201).json(training);
  } catch (error) {
    logger.error('Error creating safety training:', wrapError(error));
    res.status(500).json({ error: 'Failed to create safety training' });
  }
});

// GET /api/safety/training - List training sessions
router.get('/training', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.user!;
    const { 
      projectId, 
      trainingType, 
      status = 'all',
      upcoming = 'false',
      page = '1', 
      limit = '20' 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const whereClause: any = {
      companyId,
    };

    if (projectId) {
      whereClause.projectId = projectId;
    }

    if (trainingType) {
      whereClause.trainingType = trainingType;
    }

    if (status !== 'all') {
      whereClause.status = status;
    }

    if (upcoming === 'true') {
      whereClause.scheduledDate = {
        gte: new Date(),
      };
    }

    const trainings = await db.safetyTraining.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            name: true,
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
            participants: true,
          },
        },
      },
      skip: offset,
      take: limitNum,
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    const total = await db.safetyTraining.count({
      where: whereClause,
    });

    res.json({
      trainings: trainings.map(training => ({
        ...training,
        participantCount: training._count.participants,
        _count: undefined,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching safety trainings:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch safety trainings' });
  }
});

export default router;