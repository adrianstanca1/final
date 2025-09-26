/**
 * Enhanced Multimodal AI Service
 * Supports text, image, video, audio, and document processing
 */

import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import {
  Project,
  Todo,
  SafetyIncident,
  Expense,
  Document,
  User,
  TodoStatus,
  IncidentSeverity,
  Equipment,
} from '../types';
import { apiCache } from './cacheService';
import { wrapError, withRetry } from '../utils/errorHandling';

const MODEL_NAME = 'gemini-2.0-flash-001';
const API_KEY = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY
  ? (import.meta as any).env.VITE_GEMINI_API_KEY
  : typeof process !== 'undefined'
    ? (process.env?.GEMINI_API_KEY as string | undefined)
    : undefined;

let cachedClient: GoogleGenAI | null = null;

// Multimodal content types
export interface MultimodalContent {
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  content: string | File | Blob;
  mimeType?: string;
  metadata?: Record<string, any>;
}

export interface MultimodalAnalysisRequest {
  content: MultimodalContent[];
  task: 'analyze' | 'extract' | 'classify' | 'summarize' | 'safety_check' | 'quality_assessment' | 'progress_tracking';
  context?: string;
  projectId?: string;
  userId?: string;
}

export interface MultimodalAnalysisResult {
  analysis: string;
  confidence: number;
  extractedData?: Record<string, any>;
  recommendations?: string[];
  safetyIssues?: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location?: string;
    actionRequired: string;
  }>;
  qualityMetrics?: {
    score: number;
    issues: string[];
    improvements: string[];
  };
}

// Voice interaction interfaces
export interface VoiceCommand {
  command: string;
  parameters?: Record<string, any>;
  confidence: number;
}

export interface VoiceResponse {
  text: string;
  audioUrl?: string;
  actions?: Array<{
    type: string;
    payload: any;
  }>;
}

// Document processing interfaces
export interface DocumentAnalysisResult {
  type: 'blueprint' | 'specification' | 'report' | 'invoice' | 'contract' | 'other';
  summary: string;
  keyData: Record<string, any>;
  annotations?: Array<{
    page: number;
    coordinates: { x: number; y: number; width: number; height: number };
    text: string;
    type: 'measurement' | 'issue' | 'note';
  }>;
}

// Image analysis interfaces
export interface ImageAnalysisResult {
  description: string;
  objects: Array<{
    name: string;
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
  safetyAssessment?: {
    hazards: string[];
    complianceIssues: string[];
    recommendations: string[];
  };
  progressMetrics?: {
    completionEstimate: number;
    workQuality: number;
    materialsVisible: string[];
  };
}

const getClient = (): GoogleGenAI | null => {
  if (!API_KEY) {
    console.warn('Gemini API key not found. Multimodal features will be limited.');
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  try {
    cachedClient = new GoogleGenAI({ apiKey: API_KEY });
    return cachedClient;
  } catch (error) {
    console.error('Failed to initialise Gemini client', error);
    return null;
  }
};

// Convert file to base64 for API consumption
const fileToBase64 = async (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Enhanced multimodal analysis
export const analyzeMultimodalContent = async (
  request: MultimodalAnalysisRequest
): Promise<MultimodalAnalysisResult> => {
  const client = getClient();
  
  if (!client) {
    return {
      analysis: 'AI analysis unavailable - API key not configured',
      confidence: 0,
      recommendations: ['Configure Gemini API key to enable AI features']
    };
  }

  try {
    const parts: any[] = [];
    
    // Process different content types
    for (const content of request.content) {
      switch (content.type) {
        case 'text':
          parts.push({ text: content.content as string });
          break;
          
        case 'image':
          if (content.content instanceof File || content.content instanceof Blob) {
            const base64Data = await fileToBase64(content.content);
            parts.push({
              inline_data: {
                mime_type: content.mimeType || 'image/jpeg',
                data: base64Data
              }
            });
          }
          break;
          
        case 'video':
          if (content.content instanceof File || content.content instanceof Blob) {
            const base64Data = await fileToBase64(content.content);
            parts.push({
              inline_data: {
                mime_type: content.mimeType || 'video/mp4',
                data: base64Data
              }
            });
          }
          break;
          
        case 'audio':
          if (content.content instanceof File || content.content instanceof Blob) {
            const base64Data = await fileToBase64(content.content);
            parts.push({
              inline_data: {
                mime_type: content.mimeType || 'audio/wav',
                data: base64Data
              }
            });
          }
          break;
      }
    }

    // Task-specific prompts
    const taskPrompts = {
      analyze: `Analyze the provided content in the context of construction management. Provide detailed insights about what you observe.`,
      extract: `Extract all relevant data and information from the provided content. Structure the output clearly.`,
      classify: `Classify and categorize the content. Identify the type of construction work, materials, equipment, or issues present.`,
      summarize: `Provide a concise summary of the key points and findings from the provided content.`,
      safety_check: `Conduct a comprehensive safety assessment. Identify any safety hazards, compliance issues, or risks. Provide specific recommendations for improvement.`,
      quality_assessment: `Assess the quality of work, materials, or processes shown. Rate the quality and suggest improvements.`,
      progress_tracking: `Analyze the progress of construction work. Estimate completion percentage and identify any delays or issues.`
    };

    const contextPrompt = request.context ? `\n\nContext: ${request.context}` : '';
    const mainPrompt = taskPrompts[request.task] + contextPrompt + 
      `\n\nProvide your response in JSON format with the following structure:
      {
        "analysis": "detailed analysis text",
        "confidence": confidence_score_0_to_1,
        "extractedData": {optional extracted data},
        "recommendations": ["list of recommendations"],
        "safetyIssues": [{"severity": "level", "description": "text", "actionRequired": "action"}],
        "qualityMetrics": {"score": number, "issues": ["list"], "improvements": ["list"]}
      }`;

    parts.unshift({ text: mainPrompt });

    const result = await withRetry(
      async () => {
        const model = client.getGenerativeModel({ model: MODEL_NAME });
        return await model.generateContent(parts);
      },
      {
        maxAttempts: 3,
        delay: 1000,
        backoff: 'exponential',
      }
    );

    if (result?.response?.text) {
      try {
        const parsed = JSON.parse(result.response.text());
        return {
          analysis: parsed.analysis || 'No analysis provided',
          confidence: parsed.confidence || 0.5,
          extractedData: parsed.extractedData,
          recommendations: parsed.recommendations || [],
          safetyIssues: parsed.safetyIssues || [],
          qualityMetrics: parsed.qualityMetrics
        };
      } catch (parseError) {
        return {
          analysis: result.response.text() || 'Analysis completed but response format was unexpected',
          confidence: 0.7,
          recommendations: ['Review the analysis manually for detailed insights']
        };
      }
    }

    return {
      analysis: 'No response received from AI service',
      confidence: 0,
      recommendations: ['Try again or contact support']
    };

  } catch (error) {
    console.error('Multimodal analysis failed:', error);
    return {
      analysis: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidence: 0,
      recommendations: ['Check your internet connection and try again']
    };
  }
};

// Image-specific analysis for construction sites
export const analyzeConstructionImage = async (
  imageFile: File,
  projectId?: string,
  context?: string
): Promise<ImageAnalysisResult> => {
  const multimodalResult = await analyzeMultimodalContent({
    content: [
      { type: 'image', content: imageFile, mimeType: imageFile.type }
    ],
    task: 'analyze',
    context: `Construction site image analysis. ${context || ''}`,
    projectId
  });

  // Convert multimodal result to image-specific format
  return {
    description: multimodalResult.analysis,
    objects: [], // Would need additional object detection service
    safetyAssessment: multimodalResult.safetyIssues ? {
      hazards: multimodalResult.safetyIssues.map(issue => issue.description),
      complianceIssues: multimodalResult.safetyIssues.filter(issue => 
        issue.severity === 'high' || issue.severity === 'critical'
      ).map(issue => issue.actionRequired),
      recommendations: multimodalResult.recommendations || []
    } : undefined,
    progressMetrics: multimodalResult.qualityMetrics ? {
      completionEstimate: multimodalResult.qualityMetrics.score * 100,
      workQuality: multimodalResult.qualityMetrics.score,
      materialsVisible: []
    } : undefined
  };
};

// Voice command processing
export const processVoiceCommand = async (
  audioBlob: Blob,
  userId: string
): Promise<VoiceResponse> => {
  // First convert speech to text (would integrate with speech recognition API)
  // For now, we'll simulate this functionality
  
  try {
    const multimodalResult = await analyzeMultimodalContent({
      content: [
        { type: 'audio', content: audioBlob, mimeType: 'audio/wav' }
      ],
      task: 'extract',
      context: 'Voice command for construction management application',
      userId
    });

    return {
      text: multimodalResult.analysis,
      actions: multimodalResult.extractedData?.actions || []
    };
  } catch (error) {
    return {
      text: 'Sorry, I could not understand your voice command. Please try again.',
      actions: []
    };
  }
};

// Document analysis for construction documents
export const analyzeConstructionDocument = async (
  documentFile: File,
  documentType?: string
): Promise<DocumentAnalysisResult> => {
  const multimodalResult = await analyzeMultimodalContent({
    content: [
      { type: 'document', content: documentFile, mimeType: documentFile.type }
    ],
    task: 'extract',
    context: `Construction document analysis. Document type: ${documentType || 'unknown'}`
  });

  return {
    type: (documentType as any) || 'other',
    summary: multimodalResult.analysis,
    keyData: multimodalResult.extractedData || {},
    annotations: [] // Would require additional document processing service
  };
};

// Real-time video analysis for live construction monitoring
export const analyzeConstructionVideo = async (
  videoFile: File,
  projectId?: string
): Promise<{
  summary: string;
  keyFrameAnalysis: Array<{
    timestamp: number;
    analysis: ImageAnalysisResult;
  }>;
  overallAssessment: {
    safety: number;
    progress: number;
    quality: number;
  };
}> => {
  const multimodalResult = await analyzeMultimodalContent({
    content: [
      { type: 'video', content: videoFile, mimeType: videoFile.type }
    ],
    task: 'analyze',
    context: 'Construction site video monitoring and progress tracking',
    projectId
  });

  return {
    summary: multimodalResult.analysis,
    keyFrameAnalysis: [], // Would require video frame extraction
    overallAssessment: {
      safety: multimodalResult.qualityMetrics?.score || 0.5,
      progress: multimodalResult.qualityMetrics?.score || 0.5,
      quality: multimodalResult.qualityMetrics?.score || 0.5
    }
  };
};

// AI-powered site inspection assistant
export const generateSiteInspectionReport = async (
  inspectionData: {
    photos: File[];
    notes: string[];
    location: string;
    inspector: string;
    projectId: string;
  }
): Promise<{
  report: string;
  safetyScore: number;
  qualityScore: number;
  recommendations: string[];
  actionItems: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    assignee?: string;
    dueDate?: string;
  }>;
}> => {
  const content: MultimodalContent[] = [
    ...inspectionData.photos.map(photo => ({
      type: 'image' as const,
      content: photo,
      mimeType: photo.type
    })),
    {
      type: 'text' as const,
      content: `Site Inspection Notes: ${inspectionData.notes.join(' | ')}`
    }
  ];

  const result = await analyzeMultimodalContent({
    content,
    task: 'safety_check',
    context: `Site inspection at ${inspectionData.location} by ${inspectionData.inspector}`,
    projectId: inspectionData.projectId
  });

  return {
    report: result.analysis,
    safetyScore: result.confidence,
    qualityScore: result.qualityMetrics?.score || 0.5,
    recommendations: result.recommendations || [],
    actionItems: result.safetyIssues?.map(issue => ({
      priority: issue.severity as any,
      description: issue.actionRequired,
      assignee: undefined,
      dueDate: undefined
    })) || []
  };
};

export default {
  analyzeMultimodalContent,
  analyzeConstructionImage,
  processVoiceCommand,
  analyzeConstructionDocument,
  analyzeConstructionVideo,
  generateSiteInspectionReport
};