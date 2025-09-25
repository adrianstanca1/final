import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { db } from '../database/connection';
import { wrapError } from '../utils/errorHandling';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const createExpenseSchema = z.object({
  body: z.object({
    projectId: z.string().uuid(),
    category: z.enum(['MATERIALS', 'LABOR', 'EQUIPMENT', 'PERMITS', 'UTILITIES', 'OTHER']),
    description: z.string().min(1).max(500),
    amount: z.number().positive(),
    date: z.string().datetime(),
    vendor: z.string().optional(),
    receiptUrl: z.string().url().optional(),
    approvedById: z.string().uuid().optional(),
  }),
});

const updateExpenseSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    category: z.enum(['MATERIALS', 'LABOR', 'EQUIPMENT', 'PERMITS', 'UTILITIES', 'OTHER']).optional(),
    description: z.string().min(1).max(500).optional(),
    amount: z.number().positive().optional(),
    date: z.string().datetime().optional(),
    vendor: z.string().optional(),
    receiptUrl: z.string().url().optional(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAID']).optional(),
  }),
});

const budgetSchema = z.object({
  body: z.object({
    projectId: z.string().uuid(),
    totalBudget: z.number().positive(),
    categoryBudgets: z.object({
      MATERIALS: z.number().nonnegative().optional(),
      LABOR: z.number().nonnegative().optional(),
      EQUIPMENT: z.number().nonnegative().optional(),
      PERMITS: z.number().nonnegative().optional(),
      UTILITIES: z.number().nonnegative().optional(),
      OTHER: z.number().nonnegative().optional(),
    }).optional(),
  }),
});

const expenseParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// GET /api/financial/expenses - List expenses
router.get('/expenses', authenticateToken, async (req, res) => {
  try {
    const { companyId, role } = req.user!;
    const { 
      projectId, 
      category, 
      status, 
      startDate, 
      endDate, 
      search, 
      page = '1', 
      limit = '20' 
    } = req.query;

    // Check permissions
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to view expenses' });
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

    if (category) {
      whereClause.category = category;
    }

    if (status) {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate as string);
      }
    }

    const expenses = await db.expense.findMany({
      where: {
        ...whereClause,
        ...(search && {
          OR: [
            { description: { contains: search as string, mode: 'insensitive' } },
            { vendor: { contains: search as string, mode: 'insensitive' } },
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
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
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
        date: 'desc',
      },
    });

    const total = await db.expense.count({
      where: {
        ...whereClause,
        ...(search && {
          OR: [
            { description: { contains: search as string, mode: 'insensitive' } },
            { vendor: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
      },
    });

    // Calculate totals
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const pendingAmount = expenses
      .filter(expense => expense.status === 'PENDING')
      .reduce((sum, expense) => sum + expense.amount, 0);

    res.json({
      expenses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      summary: {
        totalAmount: Math.round(totalAmount * 100) / 100,
        pendingAmount: Math.round(pendingAmount * 100) / 100,
        approvedAmount: Math.round((totalAmount - pendingAmount) * 100) / 100,
      },
    });
  } catch (error) {
    logger.error('Error fetching expenses:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// GET /api/financial/expenses/:id - Get expense details
router.get('/expenses/:id', authenticateToken, validateRequest(expenseParamsSchema), async (req, res) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;

    const expense = await db.expense.findFirst({
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
            budget: true,
          },
        },
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    logger.error('Error fetching expense:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

// POST /api/financial/expenses - Create new expense
router.post('/expenses', authenticateToken, validateRequest(createExpenseSchema), async (req, res) => {
  try {
    const { companyId, id: userId, role } = req.user!;
    const { 
      projectId, 
      category, 
      description, 
      amount, 
      date, 
      vendor, 
      receiptUrl, 
      approvedById 
    } = req.body;

    // Check permissions
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'FOREMAN'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to create expenses' });
    }

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

    // Validate approver if provided
    if (approvedById) {
      const approver = await db.user.findFirst({
        where: {
          id: approvedById,
          companyId,
          role: { in: ['OWNER', 'ADMIN', 'PROJECT_MANAGER'] },
        },
      });

      if (!approver) {
        return res.status(400).json({ error: 'Invalid approver selected' });
      }
    }

    const expense = await db.expense.create({
      data: {
        projectId,
        category,
        description,
        amount,
        date: new Date(date),
        vendor,
        receiptUrl,
        submittedById: userId,
        approvedById,
        status: approvedById ? 'APPROVED' : 'PENDING',
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(`Expense created: ${expense.id} by user ${userId}`);
    res.status(201).json(expense);
  } catch (error) {
    logger.error('Error creating expense:', wrapError(error));
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// PUT /api/financial/expenses/:id - Update expense
router.put('/expenses/:id', authenticateToken, validateRequest(updateExpenseSchema), async (req, res) => {
  try {
    const { companyId, id: userId, role } = req.user!;
    const { id } = req.params;

    // Check if expense exists and belongs to user's company
    const existingExpense = await db.expense.findFirst({
      where: {
        id,
        project: {
          companyId,
        },
      },
    });

    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Check permissions - only submitter or managers can edit
    if (existingExpense.submittedById !== userId && !['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to update this expense' });
    }

    const updateData: any = {};
    const { category, description, amount, date, vendor, receiptUrl, status } = req.body;

    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = amount;
    if (date !== undefined) updateData.date = new Date(date);
    if (vendor !== undefined) updateData.vendor = vendor;
    if (receiptUrl !== undefined) updateData.receiptUrl = receiptUrl;

    // Only managers can change status
    if (status !== undefined) {
      if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
        return res.status(403).json({ error: 'Insufficient permissions to change expense status' });
      }
      updateData.status = status;
      if (status === 'APPROVED' || status === 'REJECTED') {
        updateData.approvedById = userId;
        updateData.approvedAt = new Date();
      }
    }

    const expense = await db.expense.update({
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
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(`Expense updated: ${expense.id} by user ${userId}`);
    res.json(expense);
  } catch (error) {
    logger.error('Error updating expense:', wrapError(error));
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// DELETE /api/financial/expenses/:id - Delete expense
router.delete('/expenses/:id', authenticateToken, validateRequest(expenseParamsSchema), async (req, res) => {
  try {
    const { companyId, id: userId, role } = req.user!;
    const { id } = req.params;

    // Check if expense exists and belongs to user's company
    const existingExpense = await db.expense.findFirst({
      where: {
        id,
        project: {
          companyId,
        },
      },
    });

    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Only submitter or managers can delete
    if (existingExpense.submittedById !== userId && !['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to delete this expense' });
    }

    // Can't delete approved or paid expenses
    if (['APPROVED', 'PAID'].includes(existingExpense.status)) {
      return res.status(400).json({ error: 'Cannot delete approved or paid expenses' });
    }

    await db.expense.delete({
      where: { id },
    });

    logger.info(`Expense deleted: ${id} by user ${userId}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting expense:', wrapError(error));
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// GET /api/financial/projects/:projectId/budget - Get project budget summary
router.get('/projects/:projectId/budget', authenticateToken, async (req, res) => {
  try {
    const { companyId, role } = req.user!;
    const { projectId } = req.params;

    // Check permissions
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to view budget' });
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

    // Get all expenses for the project
    const expenses = await db.expense.findMany({
      where: {
        projectId,
      },
      select: {
        category: true,
        amount: true,
        status: true,
        date: true,
      },
    });

    // Calculate budget utilization by category
    const categoryTotals = expenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = {
          total: 0,
          approved: 0,
          pending: 0,
          paid: 0,
        };
      }
      
      acc[expense.category].total += expense.amount;
      
      if (expense.status === 'APPROVED') {
        acc[expense.category].approved += expense.amount;
      } else if (expense.status === 'PENDING') {
        acc[expense.category].pending += expense.amount;
      } else if (expense.status === 'PAID') {
        acc[expense.category].paid += expense.amount;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate overall totals
    const totalBudget = project.budget || 0;
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalApproved = expenses
      .filter(expense => expense.status === 'APPROVED')
      .reduce((sum, expense) => sum + expense.amount, 0);
    const totalPending = expenses
      .filter(expense => expense.status === 'PENDING')
      .reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate spending trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentExpenses = expenses.filter(expense => 
      new Date(expense.date) >= thirtyDaysAgo
    );
    const recentSpending = recentExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    const budgetSummary = {
      project: {
        id: project.id,
        name: project.name,
        totalBudget,
      },
      overview: {
        totalBudget,
        totalSpent: Math.round(totalSpent * 100) / 100,
        totalApproved: Math.round(totalApproved * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        remainingBudget: Math.round((totalBudget - totalSpent) * 100) / 100,
        budgetUtilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
        isOverBudget: totalSpent > totalBudget,
      },
      categoryBreakdown: Object.entries(categoryTotals).map(([category, totals]) => ({
        category,
        ...totals,
        total: Math.round((totals as any).total * 100) / 100,
        approved: Math.round((totals as any).approved * 100) / 100,
        pending: Math.round((totals as any).pending * 100) / 100,
        paid: Math.round((totals as any).paid * 100) / 100,
      })),
      trends: {
        recentSpending: Math.round(recentSpending * 100) / 100,
        averageDaily: Math.round((recentSpending / 30) * 100) / 100,
        expenseCount: expenses.length,
      },
    };

    res.json(budgetSummary);
  } catch (error) {
    logger.error('Error fetching budget summary:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch budget summary' });
  }
});

// POST /api/financial/expenses/:id/approve - Approve expense
router.post('/expenses/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { companyId, id: userId, role } = req.user!;
    const { id } = req.params;

    // Check permissions
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to approve expenses' });
    }

    // Check if expense exists and belongs to user's company
    const existingExpense = await db.expense.findFirst({
      where: {
        id,
        project: {
          companyId,
        },
      },
    });

    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (existingExpense.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending expenses can be approved' });
    }

    const expense = await db.expense.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Expense approved: ${expense.id} by user ${userId}`);
    res.json(expense);
  } catch (error) {
    logger.error('Error approving expense:', wrapError(error));
    res.status(500).json({ error: 'Failed to approve expense' });
  }
});

export default router;