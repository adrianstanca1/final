import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TenderOpportunity, AnalysisReport } from '../../types/procurement';
import { User } from '../../types';

interface AIAnalyticsDashboardProps {
  user: User;
  tenders: TenderOpportunity[];
  analyses: AnalysisReport[];
}

interface PredictionModel {
  id: string;
  name: string;
  type: 'success_rate' | 'market_trend' | 'competitive_intel' | 'risk_assessment';
  accuracy: number;
  lastUpdated: Date;
  predictions: any[];
}

interface MarketTrend {
  sector: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  timeframe: string;
  confidence: number;
  insights: string[];
}

interface CompetitiveIntelligence {
  competitor: string;
  winRate: number;
  avgBidValue: number;
  preferredSectors: string[];
  recentWins: number;
  threat: 'high' | 'medium' | 'low';
  insights: string[];
}

interface RiskFactor {
  category: string;
  level: 'high' | 'medium' | 'low';
  impact: number;
  probability: number;
  mitigation: string;
  trend: 'increasing' | 'stable' | 'decreasing';
}

interface SuccessPrediction {
  tenderId: string;
  tenderTitle: string;
  successProbability: number;
  confidenceInterval: [number, number];
  keyFactors: string[];
  recommendedActions: string[];
  timeline: string;
}

export const AIAnalyticsDashboard: React.FC<AIAnalyticsDashboardProps> = ({ 
  user, 
  tenders, 
  analyses 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'predictions' | 'trends' | 'competition' | 'risks'>('overview');
  const [predictionModels, setPredictionModels] = useState<PredictionModel[]>([]);
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [competitiveIntel, setCompetitiveIntel] = useState<CompetitiveIntelligence[]>([]);
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
  const [successPredictions, setSuccessPredictions] = useState<SuccessPrediction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');

  // Initialize analytics data
  useEffect(() => {
    initializeAnalyticsData();
  }, [tenders, analyses]);

  const initializeAnalyticsData = () => {
    // Initialize prediction models
    const models: PredictionModel[] = [
      {
        id: '1',
        name: 'Tender Success Predictor',
        type: 'success_rate',
        accuracy: 87.3,
        lastUpdated: new Date(),
        predictions: []
      },
      {
        id: '2',
        name: 'Market Trend Analyzer',
        type: 'market_trend',
        accuracy: 82.1,
        lastUpdated: new Date(),
        predictions: []
      },
      {
        id: '3',
        name: 'Competitive Intelligence Engine',
        type: 'competitive_intel',
        accuracy: 91.7,
        lastUpdated: new Date(),
        predictions: []
      },
      {
        id: '4',
        name: 'Risk Assessment Model',
        type: 'risk_assessment',
        accuracy: 89.4,
        lastUpdated: new Date(),
        predictions: []
      }
    ];
    setPredictionModels(models);

    // Initialize market trends
    const trends: MarketTrend[] = [
      {
        sector: 'Commercial Construction',
        trend: 'up',
        change: 12.5,
        timeframe: '3 months',
        confidence: 89,
        insights: [
          'Office building renovations increased 18% post-pandemic',
          'Sustainability requirements driving premium pricing',
          'Labor shortages creating competitive bidding environment'
        ]
      },
      {
        sector: 'Healthcare Infrastructure',
        trend: 'up',
        change: 23.7,
        timeframe: '6 months',
        confidence: 94,
        insights: [
          'Hospital expansion projects at 5-year high',
          'Government healthcare investment driving growth',
          'Specialized medical facility demand surging'
        ]
      },
      {
        sector: 'Educational Buildings',
        trend: 'down',
        change: -8.3,
        timeframe: '3 months',
        confidence: 76,
        insights: [
          'Budget constraints affecting new school projects',
          'Maintenance projects preferred over new builds',
          'Hybrid learning reducing space requirements'
        ]
      },
      {
        sector: 'Infrastructure',
        trend: 'stable',
        change: 2.1,
        timeframe: '12 months',
        confidence: 81,
        insights: [
          'Government spending steady but selective',
          'Transportation projects maintaining activity',
          'Utility infrastructure seeing consistent demand'
        ]
      }
    ];
    setMarketTrends(trends);

    // Initialize competitive intelligence
    const competitors: CompetitiveIntelligence[] = [
      {
        competitor: 'Alpha Construction Ltd',
        winRate: 34.2,
        avgBidValue: 2800000,
        preferredSectors: ['Commercial', 'Healthcare'],
        recentWins: 8,
        threat: 'high',
        insights: [
          'Strong in high-value commercial projects',
          'Recently expanded healthcare division',
          'Aggressive pricing on strategic bids',
          'Established relationships with major developers'
        ]
      },
      {
        competitor: 'Beta Building Group',
        winRate: 28.6,
        avgBidValue: 1950000,
        preferredSectors: ['Educational', 'Infrastructure'],
        recentWins: 12,
        threat: 'medium',
        insights: [
          'Specializes in educational facilities',
          'Strong government relationships',
          'Focus on sustainable building practices',
          'Competitive on mid-range projects'
        ]
      },
      {
        competitor: 'Gamma Engineering',
        winRate: 22.1,
        avgBidValue: 4200000,
        preferredSectors: ['Infrastructure', 'Industrial'],
        recentWins: 5,
        threat: 'medium',
        insights: [
          'Expertise in complex infrastructure projects',
          'Higher average bid values',
          'Selective bidding strategy',
          'Strong technical capabilities'
        ]
      }
    ];
    setCompetitiveIntel(competitors);

    // Initialize risk factors
    const risks: RiskFactor[] = [
      {
        category: 'Material Costs',
        level: 'high',
        impact: 85,
        probability: 78,
        mitigation: 'Implement dynamic pricing models and supplier diversification',
        trend: 'increasing'
      },
      {
        category: 'Labor Availability',
        level: 'high',
        impact: 90,
        probability: 82,
        mitigation: 'Expand training programs and subcontractor partnerships',
        trend: 'increasing'
      },
      {
        category: 'Regulatory Changes',
        level: 'medium',
        impact: 65,
        probability: 45,
        mitigation: 'Monitor regulatory developments and maintain compliance expertise',
        trend: 'stable'
      },
      {
        category: 'Economic Uncertainty',
        level: 'medium',
        impact: 75,
        probability: 60,
        mitigation: 'Diversify portfolio and maintain flexible capacity',
        trend: 'decreasing'
      },
      {
        category: 'Technology Disruption',
        level: 'low',
        impact: 50,
        probability: 35,
        mitigation: 'Invest in digital transformation and upskilling',
        trend: 'stable'
      }
    ];
    setRiskFactors(risks);

    // Generate success predictions for current tenders
    const predictions = tenders.slice(0, 5).map((tender, index): SuccessPrediction => ({
      tenderId: tender.id,
      tenderTitle: tender.title,
      successProbability: 65 + Math.random() * 30, // Simulated AI prediction
      confidenceInterval: [45 + Math.random() * 20, 75 + Math.random() * 20] as [number, number],
      keyFactors: [
        'Strong portfolio match',
        'Competitive pricing position',
        'Local presence advantage',
        'Previous client relationship'
      ],
      recommendedActions: [
        'Emphasize sustainability credentials',
        'Highlight recent similar projects',
        'Propose value engineering options',
        'Demonstrate local workforce capacity'
      ],
      timeline: tender.deadline
    }));
    setSuccessPredictions(predictions);
  };

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Update predictions with new insights
    setSuccessPredictions(prev => prev.map(prediction => ({
      ...prediction,
      successProbability: Math.max(10, Math.min(95, prediction.successProbability + (Math.random() - 0.5) * 20))
    })));
    
    setIsAnalyzing(false);
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-600 bg-green-100';
    if (probability >= 60) return 'text-blue-600 bg-blue-100';
    if (probability >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '❓';
    }
  };

  const getThreatColor = (threat: string) => {
    switch (threat) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              🧠 Enhanced AI Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Advanced procurement intelligence with predictive analytics and market insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              title="Select analysis timeframe"
              aria-label="Select analysis timeframe"
            >
              <option value="1M">Last Month</option>
              <option value="3M">Last 3 Months</option>
              <option value="6M">Last 6 Months</option>
              <option value="1Y">Last Year</option>
            </select>
            <Button 
              onClick={runAIAnalysis}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analyzing...
                </>
              ) : (
                '🔄 Refresh Analytics'
              )}
            </Button>
          </div>
        </div>

        {/* AI Models Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {predictionModels.map((model) => (
            <div key={model.id} className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{model.name}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  model.accuracy >= 90 ? 'bg-green-100 text-green-800' :
                  model.accuracy >= 80 ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {model.accuracy}% accurate
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500">Active</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b">
        {[
          { id: 'overview', label: '📊 Overview', count: tenders.length },
          { id: 'predictions', label: '🎯 Success Predictions', count: successPredictions.length },
          { id: 'trends', label: '📈 Market Trends', count: marketTrends.length },
          { id: 'competition', label: '⚔️ Competition', count: competitiveIntel.length },
          { id: 'risks', label: '⚠️ Risk Analysis', count: riskFactors.length }
        ].map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 border-b-2 font-medium relative ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
            <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Key Metrics */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">📈 Key Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="font-medium">Average Win Rate</span>
                <span className="text-2xl font-bold text-blue-600">72.3%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="font-medium">Pipeline Value</span>
                <span className="text-2xl font-bold text-green-600">£18.7M</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="font-medium">AI Accuracy</span>
                <span className="text-2xl font-bold text-purple-600">87.6%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="font-medium">Active Tenders</span>
                <span className="text-2xl font-bold text-yellow-600">{tenders.length}</span>
              </div>
            </div>
          </Card>

          {/* Recent AI Insights */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">🤖 Recent AI Insights</h3>
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-l-4 border-blue-500">
                <p className="text-sm font-medium text-blue-800">Market Opportunity Detected</p>
                <p className="text-xs text-blue-600 mt-1">Healthcare sector showing 23.7% growth - recommend increased focus</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-l-4 border-green-500">
                <p className="text-sm font-medium text-green-800">Competitive Advantage Identified</p>
                <p className="text-xs text-green-600 mt-1">Your sustainability credentials 40% stronger than competitors</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-yellow-50 to-red-50 rounded-lg border-l-4 border-yellow-500">
                <p className="text-sm font-medium text-yellow-800">Risk Alert</p>
                <p className="text-xs text-yellow-600 mt-1">Material cost volatility increasing - consider pricing adjustments</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-l-4 border-purple-500">
                <p className="text-sm font-medium text-purple-800">Success Prediction</p>
                <p className="text-xs text-purple-600 mt-1">3 high-probability wins identified in current pipeline</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Success Predictions Tab */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">🎯 AI Success Predictions</h3>
              <div className="text-sm text-gray-500">
                Powered by machine learning analysis of 1,000+ historical bids
              </div>
            </div>
            
            <div className="space-y-4">
              {successPredictions.map((prediction) => (
                <div key={prediction.tenderId} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-lg">{prediction.tenderTitle}</h4>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getProbabilityColor(prediction.successProbability)}`}>
                        {prediction.successProbability.toFixed(1)}% Success Probability
                      </span>
                      <span className="text-xs text-gray-500">
                        CI: {prediction.confidenceInterval[0].toFixed(1)}%-{prediction.confidenceInterval[1].toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-sm text-gray-700 mb-2">🎯 Key Success Factors</h5>
                      <ul className="space-y-1">
                        {prediction.keyFactors.map((factor, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-green-500 mt-1">✓</span>
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-sm text-gray-700 mb-2">💡 AI Recommendations</h5>
                      <ul className="space-y-1">
                        {prediction.recommendedActions.map((action, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-blue-500 mt-1">→</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t flex justify-between items-center">
                    <span className="text-xs text-gray-500">Deadline: {prediction.timeline}</span>
                    <Button size="sm" variant="secondary">
                      📊 View Detailed Analysis
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Market Trends Tab */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">📈 Market Trend Analysis</h3>
            
            <div className="grid gap-6">
              {marketTrends.map((trend, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTrendIcon(trend.trend)}</span>
                      <div>
                        <h4 className="font-semibold text-lg">{trend.sector}</h4>
                        <p className="text-sm text-gray-600">{trend.timeframe} trend</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${
                        trend.trend === 'up' ? 'text-green-600' :
                        trend.trend === 'down' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {trend.change > 0 ? '+' : ''}{trend.change}%
                      </span>
                      <p className="text-xs text-gray-500">{trend.confidence}% confidence</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-sm text-gray-700 mb-2">🔍 Market Insights</h5>
                    <ul className="space-y-1">
                      {trend.insights.map((insight, insightIdx) => (
                        <li key={insightIdx} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Competition Tab */}
      {activeTab === 'competition' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">⚔️ Competitive Intelligence</h3>
            
            <div className="space-y-6">
              {competitiveIntel.map((competitor, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">{competitor.competitor}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-600">Win Rate: {competitor.winRate}%</span>
                        <span className="text-sm text-gray-600">Avg Bid: £{competitor.avgBidValue.toLocaleString()}</span>
                        <span className="text-sm text-gray-600">Recent Wins: {competitor.recentWins}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getThreatColor(competitor.threat)}`}>
                      {competitor.threat.toUpperCase()} THREAT
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-sm text-gray-700 mb-2">🎯 Preferred Sectors</h5>
                      <div className="flex flex-wrap gap-2">
                        {competitor.preferredSectors.map((sector, sectorIdx) => (
                          <span key={sectorIdx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {sector}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-sm text-gray-700 mb-2">🔍 Strategic Insights</h5>
                      <ul className="space-y-1">
                        {competitor.insights.slice(0, 2).map((insight, insightIdx) => (
                          <li key={insightIdx} className="text-xs text-gray-600 flex items-start gap-2">
                            <span className="text-yellow-500 mt-1">•</span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <Button size="sm" variant="secondary">
                      📊 View Detailed Profile
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Risk Analysis Tab */}
      {activeTab === 'risks' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">⚠️ Risk Analysis & Mitigation</h3>
            
            <div className="space-y-4">
              {riskFactors.map((risk, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-lg">{risk.category}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(risk.level)}`}>
                        {risk.level.toUpperCase()} RISK
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Impact: {risk.impact}%</span>
                        <span className="text-sm text-gray-600">Probability: {risk.probability}%</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`text-xs ${
                          risk.trend === 'increasing' ? 'text-red-600' :
                          risk.trend === 'decreasing' ? 'text-green-600' :
                          'text-gray-600'
                        }`}>
                          {risk.trend === 'increasing' ? '↗️' : risk.trend === 'decreasing' ? '↘️' : '➡️'}
                          {risk.trend}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <h5 className="font-medium text-sm text-yellow-800 mb-1">💡 Mitigation Strategy</h5>
                    <p className="text-sm text-yellow-700">{risk.mitigation}</p>
                  </div>
                  
                  <div className="mt-3 flex justify-between items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2 mr-4">
                      <div 
                        className={`h-2 rounded-full ${
                          risk.level === 'high' ? 'bg-red-500' :
                          risk.level === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                      ></div>
                    </div>
                    <Button size="sm" variant="secondary">
                      📋 Action Plan
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AIAnalyticsDashboard;