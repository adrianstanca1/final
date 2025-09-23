export interface TenderOpportunity {
  id: string;
  title: string;
  description: string;
  client: string;
  value: number;
  location: string;
  deadline: string;
  requirements: string[];
  category: 'commercial' | 'residential' | 'infrastructure' | 'heritage' | 'education' | 'healthcare';
  url?: string;
  publishDate: string;
  contactInfo?: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface AnalysisReport {
  tenderId: string;
  matchScore: number;
  keyRequirements: string[];
  ourStrengths: string[];
  potentialGaps: string[];
  risks: string[];
  recommendation: 'highly_recommended' | 'recommended' | 'consider' | 'not_recommended';
  analysis: string;
  generatedAt: string;
}

export interface WinStrategy {
  tenderId: string;
  winTheme: string;
  keySellingPoints: {
    point: string;
    relevance: string;
    evidence: string;
  }[];
  riskMitigation: {
    risk: string;
    mitigation: string;
  }[];
  evidenceToInclude: string[];
  pricingStrategy?: string;
  differentiators: string[];
  generatedAt: string;
}

export interface TenderResponse {
  tenderId: string;
  executiveSummary: string;
  understandingOfRequirements: string;
  proposedSolution: string;
  keyStrengths: string;
  riskManagement: string;
  conclusion: string;
  fullDocument: string;
  generatedAt: string;
}