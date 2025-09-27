// Multimodal AI System Types
// Comprehensive type definitions for handling multiple media types

export type MediaType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'mixed';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'custom';

// Base interface for all multimodal content
export interface MultimodalContent {
  id: string;
  type: MediaType;
  status: ProcessingStatus;
  createdAt: string;
  updatedAt: string;
  userId: string;
  projectId?: string;
  metadata: ContentMetadata;
  processingResults?: ProcessingResults;
  tags?: string[];
  description?: string;
}

// Metadata for different content types
export interface ContentMetadata {
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number; // for audio/video in seconds
  dimensions?: {
    width: number;
    height: number;
  };
  language?: string;
  encoding?: string;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  source?: 'upload' | 'camera' | 'microphone' | 'screen_capture' | 'generated';
}

// Processing results from AI analysis
export interface ProcessingResults {
  aiProvider: AIProvider;
  modelVersion: string;
  confidence: number;
  processingTime: number;
  textAnalysis?: TextAnalysisResult;
  imageAnalysis?: ImageAnalysisResult;
  audioAnalysis?: AudioAnalysisResult;
  videoAnalysis?: VideoAnalysisResult;
  documentAnalysis?: DocumentAnalysisResult;
  crossModalAnalysis?: CrossModalAnalysisResult;
}

// Text analysis results
export interface TextAnalysisResult {
  extractedText?: string;
  language: string;
  sentiment: {
    score: number; // -1 to 1
    label: 'negative' | 'neutral' | 'positive';
    confidence: number;
  };
  entities: Array<{
    text: string;
    type: 'person' | 'organization' | 'location' | 'date' | 'money' | 'other';
    confidence: number;
  }>;
  keywords: Array<{
    text: string;
    relevance: number;
  }>;
  summary?: string;
  topics: string[];
  readabilityScore?: number;
  wordCount: number;
  characterCount: number;
}

// Image analysis results
export interface ImageAnalysisResult {
  objects: Array<{
    name: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  faces: Array<{
    confidence: number;
    emotions: Record<string, number>;
    ageRange?: [number, number];
    gender?: string;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  text?: string; // OCR results
  scenes: Array<{
    name: string;
    confidence: number;
  }>;
  colors: Array<{
    hex: string;
    percentage: number;
    name?: string;
  }>;
  landmarks?: Array<{
    name: string;
    confidence: number;
    location?: {
      latitude: number;
      longitude: number;
    };
  }>;
  safetyLabels: Array<{
    name: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
  }>;
  description: string;
  tags: string[];
}

// Audio analysis results
export interface AudioAnalysisResult {
  transcription: {
    text: string;
    confidence: number;
    language: string;
    speakers?: Array<{
      id: string;
      segments: Array<{
        start: number;
        end: number;
        text: string;
        confidence: number;
      }>;
    }>;
  };
  audioFeatures: {
    volume: number;
    pitch: number;
    tempo?: number;
    musicGenre?: string;
    instruments?: string[];
  };
  emotions?: Array<{
    emotion: string;
    confidence: number;
    timestamp: number;
  }>;
  noiseLevel: number;
  silenceSegments: Array<{
    start: number;
    end: number;
  }>;
}

// Video analysis results
export interface VideoAnalysisResult {
  scenes: Array<{
    start: number;
    end: number;
    description: string;
    keyframes: string[]; // URLs to extracted keyframes
    objects: Array<{
      name: string;
      confidence: number;
      timeSegments: Array<{
        start: number;
        end: number;
      }>;
    }>;
  }>;
  faces: Array<{
    personId?: string;
    timeSegments: Array<{
      start: number;
      end: number;
      confidence: number;
    }>;
  }>;
  audio?: AudioAnalysisResult;
  motion: {
    intensity: number;
    direction?: string;
    cameraMovement?: 'static' | 'pan' | 'zoom' | 'tilt';
  };
  quality: {
    resolution: string;
    frameRate: number;
    bitrate?: number;
    stability: number; // 0-1
  };
}

// Document analysis results
export interface DocumentAnalysisResult {
  documentType: 'pdf' | 'word' | 'excel' | 'powerpoint' | 'text' | 'other';
  pageCount?: number;
  extractedText: string;
  structure: {
    headings: Array<{
      level: number;
      text: string;
      page?: number;
    }>;
    tables: Array<{
      page?: number;
      rows: number;
      columns: number;
      data?: string[][];
    }>;
    images: Array<{
      page?: number;
      description?: string;
      text?: string; // OCR from embedded images
    }>;
  };
  metadata: {
    author?: string;
    title?: string;
    subject?: string;
    creationDate?: string;
    modificationDate?: string;
    keywords?: string[];
  };
  language: string;
  summary: string;
  keyPoints: string[];
}

// Cross-modal analysis combining multiple media types
export interface CrossModalAnalysisResult {
  coherenceScore: number; // How well different media types align
  complementarity: number; // How much different media add to each other
  redundancy: number; // How much information is repeated across media
  mainTheme: string;
  insights: string[];
  recommendations: string[];
  misalignments?: Array<{
    description: string;
    severity: 'low' | 'medium' | 'high';
    mediaTypes: MediaType[];
  }>;
}

// Multimodal search query
export interface MultimodalSearchQuery {
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  filters: {
    mediaTypes?: MediaType[];
    dateRange?: {
      start: string;
      end: string;
    };
    tags?: string[];
    projectIds?: string[];
    userIds?: string[];
    minConfidence?: number;
  };
  similarity?: {
    threshold: number;
    method: 'semantic' | 'visual' | 'audio' | 'combined';
  };
  limit?: number;
  offset?: number;
}

// Search results
export interface MultimodalSearchResult {
  content: MultimodalContent;
  relevanceScore: number;
  matchedFields: string[];
  snippet?: string;
  highlights?: Array<{
    field: string;
    text: string;
    start: number;
    end: number;
  }>;
}

// Processing job for async operations
export interface ProcessingJob {
  id: string;
  contentId: string;
  type: 'analysis' | 'transcription' | 'translation' | 'summarization' | 'search_indexing';
  status: ProcessingStatus;
  progress: number; // 0-100
  startedAt: string;
  completedAt?: string;
  error?: string;
  estimatedDuration?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

// Configuration for multimodal processing
export interface MultimodalConfig {
  enabledProviders: AIProvider[];
  defaultProvider: AIProvider;
  processingOptions: {
    autoProcess: boolean;
    enableFaceDetection: boolean;
    enableOCR: boolean;
    enableTranscription: boolean;
    enableTranslation: boolean;
    targetLanguages: string[];
    qualityThreshold: number;
    maxFileSize: number; // in bytes
    allowedMimeTypes: string[];
  };
  storage: {
    provider: 'local' | 'aws' | 'gcp' | 'azure';
    bucket?: string;
    region?: string;
    encryption: boolean;
    retentionDays: number;
  };
  privacy: {
    anonymizeFaces: boolean;
    redactPII: boolean;
    dataRetentionPolicy: string;
    consentRequired: boolean;
  };
}
