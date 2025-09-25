import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { db } from '../database/connection';
import { wrapError } from '../utils/errorHandling';
import { logger } from '../utils/logger';

const router = express.Router();

// Import AI service (we'll need to create this based on frontend AI service)
// For now, we'll implement the core AI endpoints that the frontend expects

// Validation schemas
const projectInsightsSchema = z.object({
  body: z.object({
    projectId: z.string().uuid(),
    analysisType: z.enum(['PROGRESS', 'RISKS', 'BUDGET', 'TIMELINE', 'RESOURCE_ALLOCATION']).optional().default('PROGRESS'),
    includeRecommendations: z.boolean().default(true),
  }),
});

const safetyAnalysisSchema = z.object({
  body: z.object({
    projectId: z.string().uuid().optional(),
    incidentId: z.string().uuid().optional(),
    analysisType: z.enum(['INCIDENT_ANALYSIS', 'PREVENTION_RECOMMENDATIONS', 'TREND_ANALYSIS', 'COMPLIANCE_CHECK']).default('INCIDENT_ANALYSIS'),
  }),
});

const costEstimateSchema = z.object({
  body: z.object({
    projectType: z.string().min(1).max(100),
    scope: z.string().min(10).max(2000),
    location: z.string().min(1).max(200),
    size: z.object({
      value: z.number().positive(),
      unit: z.enum(['sqft', 'sqm', 'linear_ft', 'linear_m', 'unit']),
    }),
    materials: z.array(z.string()).optional(),
    complexity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']).default('MEDIUM'),
    timeline: z.number().positive().optional(), // in days
  }),
});

const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(1000),
    context: z.object({
      projectId: z.string().uuid().optional(),
      userId: z.string().uuid(),
      sessionId: z.string().optional(),
    }),
    type: z.enum(['GENERAL', 'PROJECT_SPECIFIC', 'SAFETY', 'FINANCIAL', 'TECHNICAL']).default('GENERAL'),
  }),
});

// Simple AI service implementation
class AIService {
  private static GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  private static GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

  static async generateResponse(prompt: string, context: any = {}): Promise<string> {
    if (!this.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const response = await fetch(this.GEMINI_API_URL + `?key=${this.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    } catch (error) {
      logger.error('AI service error:', wrapError(error));
      throw new Error('Failed to generate AI response');
    }
  }

  static constructProjectInsightsPrompt(project: any, tasks: any[], expenses: any[], analysisType: string): string {
    const baseContext = `
You are a construction project management AI assistant. Analyze the following project data and provide insights.

Project: ${project.name}
Status: ${project.status}
Start Date: ${project.startDate}
End Date: ${project.endDate}
Budget: $${project.budget?.toLocaleString() || 'Not specified'}
Description: ${project.description}

Tasks (${tasks.length} total):
${tasks.slice(0, 10).map(task => 
  `- ${task.title} (${task.status}) - Priority: ${task.priority}, Due: ${task.dueDate}`
).join('\n')}

Recent Expenses (${expenses.length} total):
${expenses.slice(0, 10).map(expense => 
  `- ${expense.description}: $${expense.amount} (${expense.category}) - ${expense.status}`
).join('\n')}
`;

    const analysisPrompts = {
      PROGRESS: `${baseContext}\n\nAnalyze the project progress and provide insights on completion status, potential delays, and recommendations for staying on track.`,
      RISKS: `${baseContext}\n\nIdentify potential risks in this construction project based on the current status, timeline, and expenses. Provide risk mitigation strategies.`,
      BUDGET: `${baseContext}\n\nAnalyze the budget performance and spending patterns. Identify areas of concern and provide cost optimization recommendations.`,
      TIMELINE: `${baseContext}\n\nEvaluate the project timeline and task dependencies. Identify potential bottlenecks and suggest schedule optimizations.`,
      RESOURCE_ALLOCATION: `${baseContext}\n\nAnalyze resource allocation efficiency and provide recommendations for optimal team and equipment deployment.`
    };

    return analysisPrompts[analysisType as keyof typeof analysisPrompts] || analysisPrompts.PROGRESS;
  }

  static constructSafetyAnalysisPrompt(incident: any, projectData: any, analysisType: string): string {
    const baseContext = incident ? `
Construction Safety Analysis Request

Incident Details:
- Title: ${incident.title}
- Type: ${incident.incidentType}
- Severity: ${incident.severity}
- Location: ${incident.location}
- Date: ${incident.dateOccurred}
- Description: ${incident.description}
- Injuries Reported: ${incident.injuriesReported ? 'Yes' : 'No'}
- Witness Count: ${incident.witnessCount}
- Immediate Actions: ${incident.immediateActions || 'None specified'}

Project Context:
- Project: ${projectData?.name || 'Not specified'}
- Location: ${projectData?.address || 'Not specified'}
` : `
Construction Safety Analysis Request

Project Context:
- Project: ${projectData?.name || 'Multiple projects'}
- Analysis requested for general safety trends and recommendations
`;

    const analysisPrompts = {
      INCIDENT_ANALYSIS: `${baseContext}\n\nAnalyze this safety incident and provide:\n1. Root cause analysis\n2. Contributing factors\n3. Lessons learned\n4. Specific prevention measures`,
      PREVENTION_RECOMMENDATIONS: `${baseContext}\n\nProvide comprehensive safety prevention recommendations including:\n1. Training requirements\n2. Safety equipment needs\n3. Process improvements\n4. Monitoring strategies`,
      TREND_ANALYSIS: `${baseContext}\n\nAnalyze safety trends and patterns to identify:\n1. Common incident types\n2. High-risk activities\n3. Seasonal patterns\n4. Improvement opportunities`,
      COMPLIANCE_CHECK: `${baseContext}\n\nReview for safety compliance and provide:\n1. Regulatory compliance status\n2. Required documentation\n3. Training gaps\n4. Corrective actions needed`
    };

    return analysisPrompts[analysisType as keyof typeof analysisPrompts] || analysisPrompts.INCIDENT_ANALYSIS;
  }

  static constructCostEstimatePrompt(projectData: any): string {
    return `
Construction Cost Estimation Request

Project Details:
- Type: ${projectData.projectType}
- Size: ${projectData.size.value} ${projectData.size.unit}
- Location: ${projectData.location}
- Complexity: ${projectData.complexity}
- Timeline: ${projectData.timeline ? `${projectData.timeline} days` : 'Not specified'}
- Scope: ${projectData.scope}
${projectData.materials ? `- Materials: ${projectData.materials.join(', ')}` : ''}

Please provide a detailed cost estimate including:
1. Material costs breakdown
2. Labor costs estimation
3. Equipment and tool costs
4. Permits and regulatory costs
5. Contingency recommendations
6. Timeline considerations affecting cost
7. Location-specific cost factors
8. Risk factors that could impact budget

Format the response with clear cost ranges and explanations for each category.
`;
  }

  static constructChatPrompt(message: string, context: any, type: string): string {
    const systemPrompt = `
You are an expert construction management AI assistant with deep knowledge of:
- Construction project management
- Safety regulations and best practices
- Cost estimation and budget management
- Construction scheduling and resource planning
- Building codes and compliance
- Construction materials and methods
- Equipment and technology

User Context:
- Type: ${type}
${context.projectId ? `- Current Project ID: ${context.projectId}` : ''}
- Session: ${context.sessionId || 'New conversation'}

Provide helpful, accurate, and actionable advice specific to construction management.
`;

    return `${systemPrompt}\n\nUser Question: ${message}`;
  }
}

// POST /api/ai/project-insights - Generate project analysis and insights
router.post('/project-insights', authenticateToken, validateRequest(projectInsightsSchema), async (req, res) => {
  try {
    const { companyId, role } = req.user!;
    const { projectId, analysisType, includeRecommendations } = req.body;

    // Check permissions
    if (!['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to access AI insights' });
    }

    // Get project data
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
      include: {
        tasks: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        expenses: {
          take: 20,
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const prompt = AIService.constructProjectInsightsPrompt(
      project,
      project.tasks,
      project.expenses,
      analysisType
    );

    const aiResponse = await AIService.generateResponse(prompt);

    // Store the AI interaction for future reference
    await db.aiInteraction.create({
      data: {
        userId: req.user!.id,
        projectId,
        type: 'PROJECT_INSIGHTS',
        prompt: `Project insights analysis (${analysisType})`,
        response: aiResponse,
        metadata: {
          analysisType,
          includeRecommendations,
          taskCount: project.tasks.length,
          expenseCount: project.expenses.length,
        },
      },
    });

    res.json({
      projectId,
      analysisType,
      insights: aiResponse,
      generatedAt: new Date().toISOString(),
      metadata: {
        taskCount: project.tasks.length,
        expenseCount: project.expenses.length,
        projectStatus: project.status,
      },
    });
  } catch (error) {
    logger.error('Error generating project insights:', wrapError(error));
    res.status(500).json({ error: 'Failed to generate project insights' });
  }
});

// POST /api/ai/safety-analysis - Analyze safety incidents and provide recommendations
router.post('/safety-analysis', authenticateToken, validateRequest(safetyAnalysisSchema), async (req, res) => {
  try {
    const { companyId } = req.user!;
    const { projectId, incidentId, analysisType } = req.body;

    let incident = null;
    let projectData = null;

    if (incidentId) {
      incident = await db.safetyIncident.findFirst({
        where: {
          id: incidentId,
          project: { companyId },
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
      });

      if (!incident) {
        return res.status(404).json({ error: 'Safety incident not found' });
      }
      projectData = incident.project;
    } else if (projectId) {
      projectData = await db.project.findFirst({
        where: {
          id: projectId,
          companyId,
        },
        select: {
          id: true,
          name: true,
          address: true,
        },
      });

      if (!projectData) {
        return res.status(404).json({ error: 'Project not found' });
      }
    }

    const prompt = AIService.constructSafetyAnalysisPrompt(incident, projectData, analysisType);
    const aiResponse = await AIService.generateResponse(prompt);

    // Store the AI interaction
    await db.aiInteraction.create({
      data: {
        userId: req.user!.id,
        projectId: projectData?.id,
        type: 'SAFETY_ANALYSIS',
        prompt: `Safety analysis (${analysisType})`,
        response: aiResponse,
        metadata: {
          analysisType,
          incidentId,
          incidentSeverity: incident?.severity,
          incidentType: incident?.incidentType,
        },
      },
    });

    res.json({
      analysisType,
      projectId: projectData?.id,
      incidentId,
      analysis: aiResponse,
      generatedAt: new Date().toISOString(),
      metadata: {
        incidentSeverity: incident?.severity,
        incidentType: incident?.incidentType,
        projectName: projectData?.name,
      },
    });
  } catch (error) {
    logger.error('Error generating safety analysis:', wrapError(error));
    res.status(500).json({ error: 'Failed to generate safety analysis' });
  }
});

// POST /api/ai/cost-estimate - Generate AI-powered cost estimates
router.post('/cost-estimate', authenticateToken, validateRequest(costEstimateSchema), async (req, res) => {
  try {
    const { companyId } = req.user!;
    const estimateData = req.body;

    const prompt = AIService.constructCostEstimatePrompt(estimateData);
    const aiResponse = await AIService.generateResponse(prompt);

    // Store the AI interaction
    await db.aiInteraction.create({
      data: {
        userId: req.user!.id,
        type: 'COST_ESTIMATE',
        prompt: `Cost estimate for ${estimateData.projectType}`,
        response: aiResponse,
        metadata: {
          projectType: estimateData.projectType,
          size: estimateData.size,
          location: estimateData.location,
          complexity: estimateData.complexity,
          timeline: estimateData.timeline,
        },
      },
    });

    res.json({
      projectType: estimateData.projectType,
      estimate: aiResponse,
      generatedAt: new Date().toISOString(),
      input: {
        projectType: estimateData.projectType,
        size: estimateData.size,
        location: estimateData.location,
        complexity: estimateData.complexity,
        timeline: estimateData.timeline,
      },
    });
  } catch (error) {
    logger.error('Error generating cost estimate:', wrapError(error));
    res.status(500).json({ error: 'Failed to generate cost estimate' });
  }
});

// POST /api/ai/chat - AI chat interface for construction questions
router.post('/chat', authenticateToken, validateRequest(chatSchema), async (req, res) => {
  try {
    const { message, context, type } = req.body;

    const prompt = AIService.constructChatPrompt(message, context, type);
    const aiResponse = await AIService.generateResponse(prompt);

    // Store the AI interaction
    await db.aiInteraction.create({
      data: {
        userId: req.user!.id,
        projectId: context.projectId,
        type: 'CHAT',
        prompt: message,
        response: aiResponse,
        metadata: {
          chatType: type,
          sessionId: context.sessionId,
        },
      },
    });

    res.json({
      message: aiResponse,
      type,
      sessionId: context.sessionId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in AI chat:', wrapError(error));
    res.status(500).json({ error: 'Failed to process AI chat request' });
  }
});

// GET /api/ai/history - Get AI interaction history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { id: userId } = req.user!;
    const { 
      projectId, 
      type, 
      page = '1', 
      limit = '20' 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const whereClause: any = {
      userId,
    };

    if (projectId) {
      whereClause.projectId = projectId;
    }

    if (type) {
      whereClause.type = type;
    }

    const interactions = await db.aiInteraction.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip: offset,
      take: limitNum,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = await db.aiInteraction.count({
      where: whereClause,
    });

    res.json({
      interactions: interactions.map(interaction => ({
        id: interaction.id,
        type: interaction.type,
        prompt: interaction.prompt,
        response: interaction.response.length > 200 
          ? interaction.response.substring(0, 200) + '...' 
          : interaction.response,
        fullResponse: interaction.response,
        project: interaction.project,
        createdAt: interaction.createdAt,
        metadata: interaction.metadata,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching AI history:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch AI interaction history' });
  }
});

// GET /api/ai/suggestions - Get AI suggestions for project improvement
router.get('/suggestions/:projectId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.user!;
    const { projectId } = req.params;

    // Get project with recent activity
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
      include: {
        tasks: {
          where: {
            status: { in: ['TODO', 'IN_PROGRESS'] },
          },
          take: 10,
        },
        expenses: {
          where: {
            status: 'PENDING',
          },
          take: 5,
        },
        safetyIncidents: {
          where: {
            status: { in: ['OPEN', 'INVESTIGATING'] },
          },
          take: 3,
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const prompt = `
As a construction management AI, analyze this project and provide 3-5 actionable suggestions for improvement:

Project: ${project.name}
Status: ${project.status}
Budget: $${project.budget?.toLocaleString() || 'Not set'}

Open Tasks: ${project.tasks.length}
Pending Expenses: ${project.expenses.length}
Open Safety Issues: ${project.safetyIncidents.length}

Key Focus Areas:
- Task completion and scheduling optimization
- Budget management and cost control
- Safety improvements and risk mitigation
- Resource allocation efficiency
- Communication and collaboration

Provide specific, actionable recommendations that can be implemented immediately.
`;

    const aiResponse = await AIService.generateResponse(prompt);

    // Store the interaction
    await db.aiInteraction.create({
      data: {
        userId: req.user!.id,
        projectId,
        type: 'SUGGESTIONS',
        prompt: 'Project improvement suggestions',
        response: aiResponse,
        metadata: {
          openTasks: project.tasks.length,
          pendingExpenses: project.expenses.length,
          safetyIssues: project.safetyIncidents.length,
        },
      },
    });

    res.json({
      projectId,
      suggestions: aiResponse,
      generatedAt: new Date().toISOString(),
      context: {
        openTasks: project.tasks.length,
        pendingExpenses: project.expenses.length,
        safetyIssues: project.safetyIncidents.length,
        projectStatus: project.status,
      },
    });
  } catch (error) {
    logger.error('Error generating AI suggestions:', wrapError(error));
    res.status(500).json({ error: 'Failed to generate AI suggestions' });
  }
});

export default router;