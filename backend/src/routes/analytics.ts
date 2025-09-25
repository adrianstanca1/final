import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { db } from '../database/connection';
import { wrapError } from '../utils/errorHandling';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const dashboardParamsSchema = z.object({
  query: z.object({
    timeframe: z.enum(['7', '30', '90', '365', 'all']).default('30'),
    projectId: z.string().uuid().optional(),
  }),
});

const reportsParamsSchema = z.object({
  query: z.object({
    type: z.enum(['PROJECT_SUMMARY', 'FINANCIAL_OVERVIEW', 'SAFETY_REPORT', 'TEAM_PERFORMANCE', 'CUSTOM']).default('PROJECT_SUMMARY'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    projectIds: z.array(z.string().uuid()).optional(),
    format: z.enum(['JSON', 'CSV']).default('JSON'),
  }),
});

// Helper function to get date range
const getDateRange = (timeframe: string) => {
  const now = new Date();
  const startDate = new Date();

  switch (timeframe) {
    case '7':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90':
      startDate.setDate(now.getDate() - 90);
      break;
    case '365':
      startDate.setDate(now.getDate() - 365);
      break;
    case 'all':
      startDate.setFullYear(2020, 0, 1); // Start from 2020
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  return { startDate, endDate: now };
};

// GET /api/analytics/dashboard - Comprehensive dashboard analytics
router.get('/dashboard', authenticateToken, validateRequest(dashboardParamsSchema), async (req, res) => {
  try {
    const { companyId, role } = req.user!;
    const { timeframe = '30', projectId } = req.query;

    // Check permissions
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to view analytics' });
    }

    const { startDate, endDate } = getDateRange(timeframe as string);

    const baseWhereClause = {
      companyId,
      ...(projectId && { projectId }),
    };

    const projectWhereClause = {
      ...baseWhereClause,
      updatedAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Project Statistics
    const projectStats = await db.project.groupBy({
      by: ['status'],
      where: baseWhereClause,
      _count: {
        status: true,
      },
    });

    const totalProjects = await db.project.count({
      where: baseWhereClause,
    });

    // Task Statistics
    const taskStats = await db.task.groupBy({
      by: ['status'],
      where: {
        project: baseWhereClause,
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        status: true,
      },
    });

    const overdueTasksCount = await db.task.count({
      where: {
        project: baseWhereClause,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: {
          lt: new Date(),
        },
      },
    });

    // Financial Statistics
    const financialStats = await db.expense.aggregate({
      where: {
        project: baseWhereClause,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const expensesByCategory = await db.expense.groupBy({
      by: ['category'],
      where: {
        project: baseWhereClause,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        category: true,
      },
    });

    const budgetUtilization = await db.project.aggregate({
      where: baseWhereClause,
      _sum: {
        budget: true,
      },
    });

    // Safety Statistics
    const safetyStats = await db.safetyIncident.groupBy({
      by: ['severity'],
      where: {
        project: baseWhereClause,
        dateOccurred: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        severity: true,
      },
    });

    const injuryCount = await db.safetyIncident.count({
      where: {
        project: baseWhereClause,
        dateOccurred: {
          gte: startDate,
          lte: endDate,
        },
        injuriesReported: true,
      },
    });

    // Team Performance
    const teamStats = await db.user.aggregate({
      where: {
        companyId,
        isActive: true,
      },
      _count: {
        id: true,
      },
    });

    const activeUsers = await db.user.count({
      where: {
        companyId,
        isActive: true,
        lastLoginAt: {
          gte: startDate,
        },
      },
    });

    // Time Tracking Statistics
    const timeEntries = await db.timeEntry.aggregate({
      where: {
        task: {
          project: baseWhereClause,
        },
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        duration: true,
      },
      _count: {
        id: true,
      },
    });

    // Document Statistics
    const documentStats = await db.document.aggregate({
      where: {
        companyId,
        ...(projectId && { projectId }),
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        size: true,
        downloadCount: true,
      },
      _count: {
        id: true,
      },
    });

    // Performance Trends (comparing with previous period)
    const previousStartDate = new Date(startDate);
    const periodLength = endDate.getTime() - startDate.getTime();
    previousStartDate.setTime(startDate.getTime() - periodLength);

    const previousProjectCount = await db.project.count({
      where: {
        ...baseWhereClause,
        updatedAt: {
          gte: previousStartDate,
          lt: startDate,
        },
      },
    });

    const previousExpenses = await db.expense.aggregate({
      where: {
        project: baseWhereClause,
        date: {
          gte: previousStartDate,
          lt: startDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const previousTasksCompleted = await db.task.count({
      where: {
        project: baseWhereClause,
        status: 'DONE',
        updatedAt: {
          gte: previousStartDate,
          lt: startDate,
        },
      },
    });

    const currentTasksCompleted = await db.task.count({
      where: {
        project: baseWhereClause,
        status: 'DONE',
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const dashboardData = {
      overview: {
        timeframe,
        startDate,
        endDate,
        totalProjects,
        activeUsers,
        totalTeamMembers: teamStats._count.id,
      },
      projects: {
        statusBreakdown: projectStats.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>),
        trends: {
          current: totalProjects,
          previous: previousProjectCount,
          change: previousProjectCount > 0 
            ? Math.round(((totalProjects - previousProjectCount) / previousProjectCount) * 100)
            : 0,
        },
      },
      tasks: {
        statusBreakdown: taskStats.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>),
        overdueCount: overdueTasksCount,
        completionTrend: {
          current: currentTasksCompleted,
          previous: previousTasksCompleted,
          change: previousTasksCompleted > 0 
            ? Math.round(((currentTasksCompleted - previousTasksCompleted) / previousTasksCompleted) * 100)
            : 0,
        },
      },
      financial: {
        totalSpent: Math.round((financialStats._sum.amount || 0) * 100) / 100,
        totalBudget: Math.round((budgetUtilization._sum.budget || 0) * 100) / 100,
        budgetUtilization: budgetUtilization._sum.budget > 0
          ? Math.round(((financialStats._sum.amount || 0) / budgetUtilization._sum.budget) * 100)
          : 0,
        expenseCount: financialStats._count.id,
        categoryBreakdown: expensesByCategory.map(item => ({
          category: item.category,
          amount: Math.round((item._sum.amount || 0) * 100) / 100,
          count: item._count.category,
        })),
        spendingTrend: {
          current: financialStats._sum.amount || 0,
          previous: previousExpenses._sum.amount || 0,
          change: (previousExpenses._sum.amount || 0) > 0 
            ? Math.round((((financialStats._sum.amount || 0) - (previousExpenses._sum.amount || 0)) / (previousExpenses._sum.amount || 0)) * 100)
            : 0,
        },
      },
      safety: {
        incidentCount: Object.values(safetyStats.reduce((acc, item) => {
          acc[item.severity] = item._count.severity;
          return acc;
        }, {} as Record<string, number>)).reduce((sum, count) => sum + count, 0),
        injuryCount,
        severityBreakdown: safetyStats.reduce((acc, item) => {
          acc[item.severity] = item._count.severity;
          return acc;
        }, {} as Record<string, number>),
        safetyScore: injuryCount === 0 ? 100 : Math.max(0, 100 - (injuryCount * 10)),
      },
      productivity: {
        totalHoursLogged: Math.round(((timeEntries._sum.duration || 0) / 3600) * 10) / 10, // Convert to hours
        timeEntryCount: timeEntries._count.id,
        averageHoursPerEntry: timeEntries._count.id > 0 
          ? Math.round((((timeEntries._sum.duration || 0) / timeEntries._count.id) / 3600) * 10) / 10
          : 0,
      },
      documents: {
        totalFiles: documentStats._count.id,
        totalSize: documentStats._sum.size || 0,
        totalDownloads: documentStats._sum.downloadCount || 0,
        averageFileSize: documentStats._count.id > 0 
          ? Math.round((documentStats._sum.size || 0) / documentStats._count.id)
          : 0,
      },
    };

    res.json(dashboardData);
  } catch (error) {
    logger.error('Error generating dashboard analytics:', wrapError(error));
    res.status(500).json({ error: 'Failed to generate dashboard analytics' });
  }
});

// GET /api/analytics/project/:projectId - Project-specific analytics
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { companyId, role } = req.user!;
    const { projectId } = req.params;
    const { timeframe = '30' } = req.query;

    // Check permissions
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to view project analytics' });
    }

    // Verify project belongs to user's company
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
      include: {
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { startDate, endDate } = getDateRange(timeframe as string);

    // Task Progress Over Time
    const taskProgress = await db.task.groupBy({
      by: ['status', 'priority'],
      where: {
        projectId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        status: true,
      },
    });

    // Financial Breakdown
    const expenses = await db.expense.findMany({
      where: {
        projectId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        submittedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    const expensesByCategory = expenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = {
          total: 0,
          count: 0,
          expenses: [],
        };
      }
      acc[expense.category].total += expense.amount;
      acc[expense.category].count += 1;
      acc[expense.category].expenses.push(expense);
      return acc;
    }, {} as Record<string, any>);

    // Team Performance
    const teamPerformance = await Promise.all(
      project.teamMembers.map(async (member) => {
        const tasksAssigned = await db.task.count({
          where: {
            projectId,
            assigneeId: member.userId,
          },
        });

        const tasksCompleted = await db.task.count({
          where: {
            projectId,
            assigneeId: member.userId,
            status: 'DONE',
          },
        });

        const hoursLogged = await db.timeEntry.aggregate({
          where: {
            task: {
              projectId,
              assigneeId: member.userId,
            },
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            duration: true,
          },
        });

        return {
          user: member.user,
          role: member.role,
          tasksAssigned,
          tasksCompleted,
          completionRate: tasksAssigned > 0 ? Math.round((tasksCompleted / tasksAssigned) * 100) : 0,
          hoursLogged: Math.round(((hoursLogged._sum.duration || 0) / 3600) * 10) / 10,
        };
      })
    );

    // Safety Incidents
    const safetyIncidents = await db.safetyIncident.findMany({
      where: {
        projectId,
        dateOccurred: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        dateOccurred: 'desc',
      },
    });

    // Timeline Analysis
    const projectDuration = project.endDate && project.startDate 
      ? Math.ceil((project.endDate.getTime() - project.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const daysSinceStart = project.startDate 
      ? Math.ceil((Date.now() - project.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const completedTasks = await db.task.count({
      where: {
        projectId,
        status: 'DONE',
      },
    });

    const totalTasks = await db.task.count({
      where: {
        projectId,
      },
    });

    const projectAnalytics = {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        budget: project.budget,
        description: project.description,
      },
      timeline: {
        totalDuration: projectDuration,
        daysSinceStart,
        daysRemaining: project.endDate 
          ? Math.ceil((project.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
        progressPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        statusBreakdown: taskProgress.reduce((acc, item) => {
          if (!acc[item.status]) acc[item.status] = 0;
          acc[item.status] += item._count.status;
          return acc;
        }, {} as Record<string, number>),
        priorityBreakdown: taskProgress.reduce((acc, item) => {
          if (!acc[item.priority]) acc[item.priority] = 0;
          acc[item.priority] += item._count.status;
          return acc;
        }, {} as Record<string, number>),
      },
      financial: {
        budget: project.budget || 0,
        totalSpent: expenses.reduce((sum, expense) => sum + expense.amount, 0),
        remainingBudget: (project.budget || 0) - expenses.reduce((sum, expense) => sum + expense.amount, 0),
        budgetUtilization: project.budget > 0 
          ? Math.round((expenses.reduce((sum, expense) => sum + expense.amount, 0) / project.budget) * 100)
          : 0,
        expensesByCategory: Object.entries(expensesByCategory).map(([category, data]) => ({
          category,
          total: Math.round((data as any).total * 100) / 100,
          count: (data as any).count,
          averageAmount: Math.round(((data as any).total / (data as any).count) * 100) / 100,
        })),
        recentExpenses: expenses.slice(0, 10).map(expense => ({
          id: expense.id,
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
          submittedBy: `${expense.submittedBy.firstName} ${expense.submittedBy.lastName}`,
          status: expense.status,
        })),
      },
      team: {
        memberCount: project.teamMembers.length,
        performance: teamPerformance,
        totalHoursLogged: teamPerformance.reduce((sum, member) => sum + member.hoursLogged, 0),
        averageCompletionRate: teamPerformance.length > 0 
          ? Math.round(teamPerformance.reduce((sum, member) => sum + member.completionRate, 0) / teamPerformance.length)
          : 0,
      },
      safety: {
        incidentCount: safetyIncidents.length,
        injuryCount: safetyIncidents.filter(incident => incident.injuriesReported).length,
        severityBreakdown: safetyIncidents.reduce((acc, incident) => {
          if (!acc[incident.severity]) acc[incident.severity] = 0;
          acc[incident.severity] += 1;
          return acc;
        }, {} as Record<string, number>),
        recentIncidents: safetyIncidents.slice(0, 5).map(incident => ({
          id: incident.id,
          title: incident.title,
          severity: incident.severity,
          incidentType: incident.incidentType,
          dateOccurred: incident.dateOccurred,
          status: incident.status,
        })),
      },
      insights: {
        riskFactors: [
          ...(project.budget > 0 && expenses.reduce((sum, e) => sum + e.amount, 0) > project.budget * 0.9 
            ? ['Budget utilization exceeding 90%'] 
            : []),
          ...(safetyIncidents.filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL').length > 0 
            ? ['High severity safety incidents reported'] 
            : []),
          ...(totalTasks > 0 && completedTasks / totalTasks < 0.5 && daysSinceStart && daysSinceStart > 30
            ? ['Project progress below expected rate'] 
            : []),
        ],
        recommendations: [
          ...(project.budget > 0 && expenses.reduce((sum, e) => sum + e.amount, 0) > project.budget * 0.8 
            ? ['Monitor budget closely, consider cost optimization measures'] 
            : []),
          ...(teamPerformance.some(member => member.completionRate < 70) 
            ? ['Provide additional support to team members with low completion rates'] 
            : []),
          ...(safetyIncidents.length > 0 
            ? ['Review safety protocols and provide additional training'] 
            : []),
        ],
      },
    };

    res.json(projectAnalytics);
  } catch (error) {
    logger.error('Error generating project analytics:', wrapError(error));
    res.status(500).json({ error: 'Failed to generate project analytics' });
  }
});

// GET /api/analytics/reports - Generate comprehensive reports
router.get('/reports', authenticateToken, validateRequest(reportsParamsSchema), async (req, res) => {
  try {
    const { companyId, role } = req.user!;

    // Check permissions
    if (!['OWNER', 'ADMIN'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to generate reports' });
    }

    const { 
      type = 'PROJECT_SUMMARY', 
      startDate, 
      endDate, 
      projectIds, 
      format = 'JSON' 
    } = req.query;

    let dateRange: any = {};
    if (startDate && endDate) {
      dateRange = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    } else {
      // Default to last 30 days
      const { startDate: defaultStart, endDate: defaultEnd } = getDateRange('30');
      dateRange = {
        gte: defaultStart,
        lte: defaultEnd,
      };
    }

    let whereClause: any = {
      companyId,
    };

    if (projectIds && Array.isArray(projectIds)) {
      whereClause.id = {
        in: projectIds as string[],
      };
    }

    let reportData: any = {};

    switch (type) {
      case 'PROJECT_SUMMARY':
        const projects = await db.project.findMany({
          where: whereClause,
          include: {
            tasks: {
              include: {
                assignee: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            expenses: {
              where: {
                date: dateRange,
              },
            },
            teamMembers: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    role: true,
                  },
                },
              },
            },
            safetyIncidents: {
              where: {
                dateOccurred: dateRange,
              },
            },
          },
        });

        reportData = {
          type: 'PROJECT_SUMMARY',
          generatedAt: new Date(),
          dateRange: { startDate: dateRange.gte, endDate: dateRange.lte },
          projects: projects.map(project => ({
            id: project.id,
            name: project.name,
            status: project.status,
            startDate: project.startDate,
            endDate: project.endDate,
            budget: project.budget,
            tasks: {
              total: project.tasks.length,
              completed: project.tasks.filter(task => task.status === 'DONE').length,
              overdue: project.tasks.filter(task => 
                task.dueDate && 
                new Date(task.dueDate) < new Date() && 
                task.status !== 'DONE'
              ).length,
            },
            financial: {
              totalExpenses: project.expenses.reduce((sum, expense) => sum + expense.amount, 0),
              budgetUtilization: project.budget > 0 
                ? Math.round((project.expenses.reduce((sum, expense) => sum + expense.amount, 0) / project.budget) * 100)
                : 0,
            },
            team: {
              memberCount: project.teamMembers.length,
              members: project.teamMembers.map(member => ({
                name: `${member.user.firstName} ${member.user.lastName}`,
                role: member.role,
              })),
            },
            safety: {
              incidentCount: project.safetyIncidents.length,
              injuryCount: project.safetyIncidents.filter(incident => incident.injuriesReported).length,
            },
          })),
          summary: {
            totalProjects: projects.length,
            activeProjects: projects.filter(p => p.status === 'IN_PROGRESS').length,
            completedProjects: projects.filter(p => p.status === 'COMPLETED').length,
            totalBudget: projects.reduce((sum, project) => sum + (project.budget || 0), 0),
            totalSpent: projects.reduce((sum, project) => 
              sum + project.expenses.reduce((expSum, expense) => expSum + expense.amount, 0), 0
            ),
          },
        };
        break;

      case 'FINANCIAL_OVERVIEW':
        const financialData = await db.expense.findMany({
          where: {
            project: { companyId },
            date: dateRange,
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                budget: true,
              },
            },
            submittedBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        reportData = {
          type: 'FINANCIAL_OVERVIEW',
          generatedAt: new Date(),
          dateRange: { startDate: dateRange.gte, endDate: dateRange.lte },
          summary: {
            totalExpenses: financialData.reduce((sum, expense) => sum + expense.amount, 0),
            expenseCount: financialData.length,
            averageExpense: financialData.length > 0 
              ? Math.round((financialData.reduce((sum, expense) => sum + expense.amount, 0) / financialData.length) * 100) / 100
              : 0,
          },
          categoryBreakdown: financialData.reduce((acc, expense) => {
            if (!acc[expense.category]) {
              acc[expense.category] = { total: 0, count: 0 };
            }
            acc[expense.category].total += expense.amount;
            acc[expense.category].count += 1;
            return acc;
          }, {} as Record<string, any>),
          projectBreakdown: financialData.reduce((acc, expense) => {
            const projectName = expense.project.name;
            if (!acc[projectName]) {
              acc[projectName] = { total: 0, count: 0, budget: expense.project.budget || 0 };
            }
            acc[projectName].total += expense.amount;
            acc[projectName].count += 1;
            return acc;
          }, {} as Record<string, any>),
          expenses: financialData.map(expense => ({
            id: expense.id,
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            date: expense.date,
            project: expense.project.name,
            submittedBy: `${expense.submittedBy.firstName} ${expense.submittedBy.lastName}`,
            status: expense.status,
          })),
        };
        break;

      case 'SAFETY_REPORT':
        const safetyData = await db.safetyIncident.findMany({
          where: {
            project: { companyId },
            dateOccurred: dateRange,
          },
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
        });

        reportData = {
          type: 'SAFETY_REPORT',
          generatedAt: new Date(),
          dateRange: { startDate: dateRange.gte, endDate: dateRange.lte },
          summary: {
            totalIncidents: safetyData.length,
            injuryIncidents: safetyData.filter(incident => incident.injuriesReported).length,
            criticalIncidents: safetyData.filter(incident => incident.severity === 'CRITICAL').length,
            injuryRate: safetyData.length > 0 
              ? Math.round((safetyData.filter(incident => incident.injuriesReported).length / safetyData.length) * 100)
              : 0,
          },
          severityBreakdown: safetyData.reduce((acc, incident) => {
            if (!acc[incident.severity]) acc[incident.severity] = 0;
            acc[incident.severity] += 1;
            return acc;
          }, {} as Record<string, number>),
          typeBreakdown: safetyData.reduce((acc, incident) => {
            if (!acc[incident.incidentType]) acc[incident.incidentType] = 0;
            acc[incident.incidentType] += 1;
            return acc;
          }, {} as Record<string, number>),
          incidents: safetyData.map(incident => ({
            id: incident.id,
            title: incident.title,
            severity: incident.severity,
            incidentType: incident.incidentType,
            location: incident.location,
            dateOccurred: incident.dateOccurred,
            injuriesReported: incident.injuriesReported,
            project: incident.project.name,
            reportedBy: `${incident.reportedBy.firstName} ${incident.reportedBy.lastName}`,
            status: incident.status,
          })),
        };
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    if (format === 'CSV') {
      // Convert to CSV format
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type.toLowerCase()}_report.csv"`);
      
      // Simple CSV conversion (this could be enhanced with a proper CSV library)
      const csvData = JSON.stringify(reportData);
      res.send(csvData);
    } else {
      res.json(reportData);
    }
  } catch (error) {
    logger.error('Error generating report:', wrapError(error));
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;