import { AnalysisReport, WinStrategy, TenderResponse, TenderOpportunity } from '../types/procurement';

export interface ExportData {
  tender: TenderOpportunity;
  analysis?: AnalysisReport;
  strategy?: WinStrategy;
  response?: TenderResponse;
  exportDate: string;
  exportedBy: string;
}

export interface ConfidenceScore {
  overall: number;
  breakdown: {
    dataQuality: number;
    analysisDepth: number;
    marketInsights: number;
    riskAssessment: number;
  };
  explanation: string;
}

export class ProcurementExportService {
  /**
   * Calculate AI confidence score for the analysis
   */
  static calculateConfidenceScore(
    analysis: AnalysisReport,
    tender: TenderOpportunity,
    strategy?: WinStrategy
  ): ConfidenceScore {
    // Data quality score based on tender information completeness
    const dataQuality = this.calculateDataQualityScore(tender);
    
    // Analysis depth based on the comprehensiveness of analysis
    const analysisDepth = this.calculateAnalysisDepthScore(analysis);
    
    // Market insights based on competitive analysis
    const marketInsights = this.calculateMarketInsightsScore(analysis);
    
    // Risk assessment confidence
    const riskAssessment = this.calculateRiskAssessmentScore(analysis);
    
    // Overall confidence is weighted average
    const overall = Math.round(
      (dataQuality * 0.2 + analysisDepth * 0.3 + marketInsights * 0.25 + riskAssessment * 0.25)
    );

    const explanation = this.generateConfidenceExplanation(overall, {
      dataQuality,
      analysisDepth,
      marketInsights,
      riskAssessment
    });

    return {
      overall,
      breakdown: {
        dataQuality,
        analysisDepth,
        marketInsights,
        riskAssessment
      },
      explanation
    };
  }

  private static calculateDataQualityScore(tender: TenderOpportunity): number {
    let score = 0;
    const factors = [
      tender.title?.length > 10,
      tender.description?.length > 100,
      tender.requirements?.length > 0,
      tender.budget && tender.budget > 0,
      tender.deadline != null,
      tender.location?.length > 0,
      tender.contactInfo?.length > 0
    ];
    
    score = (factors.filter(Boolean).length / factors.length) * 100;
    return Math.round(score);
  }

  private static calculateAnalysisDepthScore(analysis: AnalysisReport): number {
    let score = 0;
    const factors = [
      analysis.ourStrengths?.length > 2,
      analysis.gaps?.length > 0,
      analysis.risks?.length > 0,
      analysis.matchScore > 0,
      analysis.keyRequirements?.length > 3,
      analysis.recommendation !== 'not_recommended'
    ];
    
    score = (factors.filter(Boolean).length / factors.length) * 100;
    return Math.round(score);
  }

  private static calculateMarketInsightsScore(analysis: AnalysisReport): number {
    // Simulate market insights confidence based on analysis quality
    const hasCompetitorInfo = analysis.risks?.some(risk => 
      risk.toLowerCase().includes('competitor') || risk.toLowerCase().includes('competition')
    );
    const hasMarketAnalysis = analysis.ourStrengths?.length > 0 && analysis.gaps?.length > 0;
    
    let score = 60; // Base score
    if (hasCompetitorInfo) score += 20;
    if (hasMarketAnalysis) score += 20;
    
    return Math.min(100, score);
  }

  private static calculateRiskAssessmentScore(analysis: AnalysisReport): number {
    const riskCount = analysis.risks?.length || 0;
    const hasDetailedRisks = analysis.risks?.some(risk => risk.length > 20);
    
    let score = 50; // Base score
    if (riskCount >= 3) score += 25;
    if (hasDetailedRisks) score += 25;
    
    return Math.min(100, score);
  }

  private static generateConfidenceExplanation(
    overall: number,
    breakdown: { dataQuality: number; analysisDepth: number; marketInsights: number; riskAssessment: number }
  ): string {
    const { dataQuality, analysisDepth, marketInsights, riskAssessment } = breakdown;
    
    if (overall >= 85) {
      return "High confidence: Comprehensive tender data with thorough analysis and strong market insights.";
    } else if (overall >= 70) {
      return "Good confidence: Solid analysis with minor gaps in data or market understanding.";
    } else if (overall >= 55) {
      return "Moderate confidence: Analysis based on limited data or market insights.";
    } else {
      return "Low confidence: Analysis may be incomplete due to insufficient data or market information.";
    }
  }

  /**
   * Export analysis to PDF format
   */
  static async exportToPDF(data: ExportData, confidenceScore?: ConfidenceScore): Promise<void> {
    const content = this.generatePDFContent(data, confidenceScore);
    
    // Create a blob and download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procurement-analysis-${data.tender.id}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export analysis to Excel format (CSV)
   */
  static async exportToExcel(data: ExportData, confidenceScore?: ConfidenceScore): Promise<void> {
    const csvContent = this.generateCSVContent(data, confidenceScore);
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procurement-analysis-${data.tender.id}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export analysis to JSON format
   */
  static async exportToJSON(data: ExportData, confidenceScore?: ConfidenceScore): Promise<void> {
    const exportData = {
      ...data,
      confidenceScore,
      metadata: {
        exportFormat: 'JSON',
        exportDate: new Date().toISOString(),
        version: '1.0'
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procurement-analysis-${data.tender.id}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private static generatePDFContent(data: ExportData, confidenceScore?: ConfidenceScore): string {
    return `
PROCUREMENT ANALYSIS REPORT
============================

Generated: ${data.exportDate}
Exported by: ${data.exportedBy}

${confidenceScore ? `
AI CONFIDENCE SCORE: ${confidenceScore.overall}%
${confidenceScore.explanation}

Confidence Breakdown:
- Data Quality: ${confidenceScore.breakdown.dataQuality}%
- Analysis Depth: ${confidenceScore.breakdown.analysisDepth}%
- Market Insights: ${confidenceScore.breakdown.marketInsights}%
- Risk Assessment: ${confidenceScore.breakdown.riskAssessment}%

` : ''}

TENDER DETAILS
==============
Title: ${data.tender.title}
Description: ${data.tender.description}
Budget: ${data.tender.budget ? `$${data.tender.budget.toLocaleString()}` : 'Not specified'}
Deadline: ${data.tender.deadline ? new Date(data.tender.deadline).toLocaleDateString() : 'Not specified'}
Location: ${data.tender.location || 'Not specified'}

${data.analysis ? `
ANALYSIS RESULTS
================
Match Score: ${data.analysis.matchScore}%
Recommendation: ${data.analysis.recommendation.replace('_', ' ').toUpperCase()}

Strengths:
${data.analysis.ourStrengths?.map(s => `• ${s}`).join('\n') || 'None identified'}

Gaps:
${data.analysis.gaps?.map(g => `• ${g}`).join('\n') || 'None identified'}

Risks:
${data.analysis.risks?.map(r => `• ${r}`).join('\n') || 'None identified'}

Key Requirements:
${data.analysis.keyRequirements?.map(kr => `• ${kr}`).join('\n') || 'None identified'}
` : ''}

${data.strategy ? `
WIN STRATEGY
============
${JSON.stringify(data.strategy, null, 2)}
` : ''}

${data.response ? `
TENDER RESPONSE
===============
${data.response.fullDocument || JSON.stringify(data.response, null, 2)}
` : ''}

---
Report generated by AI Procurement Analysis System
`;
  }

  private static generateCSVContent(data: ExportData, confidenceScore?: ConfidenceScore): string {
    const headers = [
      'Tender ID',
      'Title',
      'Budget',
      'Deadline',
      'Match Score',
      'Recommendation',
      'Confidence Score',
      'Data Quality',
      'Analysis Depth',
      'Market Insights',
      'Risk Assessment',
      'Export Date',
      'Exported By'
    ];

    const values = [
      data.tender.id,
      `"${data.tender.title || ''}"`,
      data.tender.budget || 0,
      data.tender.deadline ? new Date(data.tender.deadline).toISOString() : '',
      data.analysis?.matchScore || 0,
      `"${data.analysis?.recommendation || ''}"`,
      confidenceScore?.overall || 0,
      confidenceScore?.breakdown.dataQuality || 0,
      confidenceScore?.breakdown.analysisDepth || 0,
      confidenceScore?.breakdown.marketInsights || 0,
      confidenceScore?.breakdown.riskAssessment || 0,
      data.exportDate,
      `"${data.exportedBy}"`
    ];

    return headers.join(',') + '\n' + values.join(',');
  }

  /**
   * Generate comprehensive report with all data
   */
  static generateComprehensiveReport(data: ExportData, confidenceScore?: ConfidenceScore): string {
    return this.generatePDFContent(data, confidenceScore);
  }
}