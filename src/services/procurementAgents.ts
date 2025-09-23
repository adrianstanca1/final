import { generateCostEstimate, generateProjectHealthSummary } from './ai';
import { CompanyProfile, getCompanyProfile } from '../data/companyProfile';
import { TenderOpportunity, AnalysisReport, WinStrategy, TenderResponse } from '../types/procurement';

export class AnalystAgent {
  private companyProfile: CompanyProfile;

  constructor() {
    this.companyProfile = getCompanyProfile();
  }

  async analyzeTender(tender: TenderOpportunity): Promise<AnalysisReport> {
    console.log(`⚖️ AnalystAgent: Analyzing tender: '${tender.title}'`);

    const companyProfileText = this.formatCompanyProfile();
    const tenderText = this.formatTenderInfo(tender);

    const prompt = `
You are a professional Bid Analyst for a UK construction company.
Your task is to perform a detailed feasibility analysis of the following tender opportunity based on our company profile.

**Our Company Profile:**
---
${companyProfileText}
---

**Tender Opportunity Details:**
---
${tenderText}
---

Produce a JSON response with the following structure:
{
  "matchScore": [percentage 0-100],
  "keyRequirements": [array of 3-5 most critical requirements],
  "ourStrengths": [array of specific strengths that make us suitable],
  "potentialGaps": [array of potential weaknesses or missing requirements],
  "risks": [array of risks we should consider],
  "recommendation": "highly_recommended|recommended|consider|not_recommended",
  "analysis": "Detailed analysis explaining the match score and rationale"
}

Focus on:
- Match between tender requirements and our past projects
- Geographic suitability 
- Financial capacity vs project value
- Technical capabilities and certifications
- Timeline feasibility
- Risk assessment
`;

    try {
      const response = await generateProjectInsights(prompt);
      
      // Parse the AI response
      let analysisData;
      try {
        analysisData = JSON.parse(response);
      } catch (e) {
        // Fallback parsing if AI doesn't return valid JSON
        analysisData = this.parseAnalysisFromText(response, tender);
      }

      return {
        tenderId: tender.id,
        matchScore: analysisData.matchScore || 0,
        keyRequirements: analysisData.keyRequirements || [],
        ourStrengths: analysisData.ourStrengths || [],
        potentialGaps: analysisData.potentialGaps || [],
        risks: analysisData.risks || [],
        recommendation: analysisData.recommendation || 'consider',
        analysis: analysisData.analysis || response,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error analyzing tender:', error);
      throw new Error('Failed to analyze tender opportunity');
    }
  }

  private formatCompanyProfile(): string {
    const profile = this.companyProfile;
    return `
# ${profile.name}

## Core Services & Specializations
${profile.coreServices.map(service => `- ${service}`).join('\n')}

## Specializations
${profile.specializations.map(spec => `- ${spec}`).join('\n')}

## Certifications
${profile.certifications.map(cert => `- ${cert}`).join('\n')}

## Key Personnel
${profile.keyPersonnel.map(person => 
  `- **${person.name}, ${person.role}**: ${person.experience}. Specialties: ${person.specialties.join(', ')}`
).join('\n')}

## Team Capacity
- Total team: ${profile.teamSize.total} people
- Skilled professionals: ${profile.teamSize.skilled}
- Certified specialists: ${profile.teamSize.certified}

## Past Projects & Case Studies
${profile.pastProjects.map(project => `
**${project.name} (${project.year})**: ${project.type} project in ${project.location}. Value: £${project.value.toLocaleString()}. 
Highlights: ${project.highlights.join('; ')}
`).join('\n')}

## Unique Selling Propositions
${profile.uniqueSellingPoints.map(usp => `- ${usp}`).join('\n')}

## Geographic Focus
${profile.geographicFocus.map(area => `- ${area}`).join('\n')}

## Financial Capacity
- Maximum project value: £${profile.financialCapacity.maxProjectValue.toLocaleString()}
- Bonding capacity: £${profile.financialCapacity.bondingCapacity.toLocaleString()}
- Insurance coverage: £${profile.financialCapacity.insuranceCoverage.toLocaleString()}

## Performance Metrics
- On-time delivery rate: ${profile.performanceMetrics.onTimeDeliveryRate}%
- Budget compliance rate: ${profile.performanceMetrics.budgetComplianceRate}%
- Safety record: ${profile.performanceMetrics.safetyRecord}
- Client satisfaction: ${profile.performanceMetrics.clientSatisfactionScore}/5.0
`;
  }

  private formatTenderInfo(tender: TenderOpportunity): string {
    return `
Title: ${tender.title}
Client: ${tender.client}
Value: £${tender.value.toLocaleString()}
Location: ${tender.location}
Deadline: ${tender.deadline}
Category: ${tender.category}
Published: ${tender.publishDate}

Description:
${tender.description}

Requirements:
${tender.requirements.map(req => `- ${req}`).join('\n')}
`;
  }

  private parseAnalysisFromText(text: string, tender: TenderOpportunity): any {
    // Basic fallback parsing for non-JSON responses
    const matchScoreMatch = text.match(/(\d+)%/);
    const matchScore = matchScoreMatch ? parseInt(matchScoreMatch[1]) : 50;

    return {
      matchScore,
      keyRequirements: tender.requirements.slice(0, 5),
      ourStrengths: ["Experience in similar projects", "Strong local presence", "Excellent track record"],
      potentialGaps: ["Specific certifications may be required", "Timeline may be challenging"],
      risks: ["Market competition", "Resource availability"],
      recommendation: matchScore > 70 ? 'recommended' : 'consider',
      analysis: text
    };
  }
}

export class StrategistAgent {
  async developStrategy(tender: TenderOpportunity, analysisReport: AnalysisReport): Promise<WinStrategy> {
    console.log(`🧠 StrategistAgent: Developing win strategy for: '${tender.title}'`);

    const prompt = `
You are a senior Bid Strategist for a UK construction company.
Your task is to develop a compelling "Win Strategy" for an upcoming tender based on the feasibility analysis.

**Tender Details:**
Title: ${tender.title}
Client: ${tender.client}
Value: £${tender.value.toLocaleString()}
Location: ${tender.location}
Category: ${tender.category}

**Analysis Report:**
Match Score: ${analysisReport.matchScore}%
Key Requirements: ${analysisReport.keyRequirements.join(', ')}
Our Strengths: ${analysisReport.ourStrengths.join(', ')}
Potential Gaps: ${analysisReport.potentialGaps.join(', ')}
Risks: ${analysisReport.risks.join(', ')}

Create a JSON response with this structure:
{
  "winTheme": "Single powerful sentence that should be the core message of our bid",
  "keySellingPoints": [
    {
      "point": "Key strength we must emphasize",
      "relevance": "Why it's relevant to this tender",
      "evidence": "Specific evidence from our track record"
    }
  ],
  "riskMitigation": [
    {
      "risk": "Identified risk or gap",
      "mitigation": "How we'll address it"
    }
  ],
  "evidenceToInclude": ["Specific past projects or data points to highlight"],
  "differentiators": ["What sets us apart from competitors"]
}
`;

    try {
      const response = await generateProjectInsights(prompt);
      
      let strategyData;
      try {
        strategyData = JSON.parse(response);
      } catch (e) {
        strategyData = this.parseStrategyFromText(response, tender, analysisReport);
      }

      return {
        tenderId: tender.id,
        winTheme: strategyData.winTheme || `Delivering excellence for ${tender.client} with proven expertise and innovation`,
        keySellingPoints: strategyData.keySellingPoints || [],
        riskMitigation: strategyData.riskMitigation || [],
        evidenceToInclude: strategyData.evidenceToInclude || [],
        differentiators: strategyData.differentiators || [],
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error developing strategy:', error);
      throw new Error('Failed to develop win strategy');
    }
  }

  private parseStrategyFromText(text: string, tender: TenderOpportunity, analysis: AnalysisReport): any {
    return {
      winTheme: `Delivering exceptional ${tender.category} expertise for ${tender.client} with proven track record and innovation`,
      keySellingPoints: analysis.ourStrengths.map(strength => ({
        point: strength,
        relevance: "Directly applicable to project requirements",
        evidence: "Demonstrated in recent similar projects"
      })),
      riskMitigation: analysis.risks.map(risk => ({
        risk,
        mitigation: "Proactive management and contingency planning"
      })),
      evidenceToInclude: ["Recent project successes", "Client testimonials", "Performance metrics"],
      differentiators: ["Local expertise", "Innovation focus", "Sustainability leadership"]
    };
  }
}

export class WriterAgent {
  async draftResponse(
    tender: TenderOpportunity,
    analysis: AnalysisReport,
    strategy: WinStrategy
  ): Promise<TenderResponse> {
    console.log(`✍️ WriterAgent: Drafting response for: '${tender.title}'`);

    const prompt = `
You are a professional Bid Writer for a leading UK construction firm.
Write a compelling tender response based on the provided analysis and strategy.

**Tender:** ${tender.title} for ${tender.client}
**Value:** £${tender.value.toLocaleString()}
**Win Theme:** ${strategy.winTheme}
**Match Score:** ${analysis.matchScore}%

**Strategy Highlights:**
${strategy.keySellingPoints.map(point => `- ${point.point}: ${point.relevance}`).join('\n')}

Create a professional tender response with these sections:
1. Executive Summary (compelling opening with win theme)
2. Understanding of Requirements (demonstrate comprehension)
3. Our Proposed Solution & Key Strengths (elaborate on selling points)
4. Risk Management (address identified gaps confidently)
5. Conclusion (strong closing statement)

Write in a confident, professional tone that positions us as the ideal choice.
`;

    try {
      const response = await generateProjectInsights(prompt);
      
      const sections = this.parseTenderResponse(response);

      return {
        tenderId: tender.id,
        executiveSummary: sections.executiveSummary,
        understandingOfRequirements: sections.understandingOfRequirements,
        proposedSolution: sections.proposedSolution,
        keyStrengths: sections.keyStrengths,
        riskManagement: sections.riskManagement,
        conclusion: sections.conclusion,
        fullDocument: response,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error drafting response:', error);
      throw new Error('Failed to draft tender response');
    }
  }

  private parseTenderResponse(fullText: string) {
    // Basic parsing to extract sections
    const sections = {
      executiveSummary: this.extractSection(fullText, 'Executive Summary', 'Understanding'),
      understandingOfRequirements: this.extractSection(fullText, 'Understanding', 'Proposed Solution'),
      proposedSolution: this.extractSection(fullText, 'Proposed Solution', 'Risk Management'),
      keyStrengths: this.extractSection(fullText, 'Key Strengths', 'Risk Management'),
      riskManagement: this.extractSection(fullText, 'Risk Management', 'Conclusion'),
      conclusion: this.extractSection(fullText, 'Conclusion', null)
    };

    return sections;
  }

  private extractSection(text: string, startKeyword: string, endKeyword: string | null): string {
    const startIndex = text.toLowerCase().indexOf(startKeyword.toLowerCase());
    if (startIndex === -1) return '';

    const endIndex = endKeyword 
      ? text.toLowerCase().indexOf(endKeyword.toLowerCase(), startIndex + startKeyword.length)
      : text.length;

    if (endIndex === -1) return text.substring(startIndex);
    
    return text.substring(startIndex, endIndex).trim();
  }
}