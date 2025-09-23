import { GoogleGenerativeAI } from '@google/generative-ai';
import { TenderOpportunity, AnalysisReport } from '../types/procurement';
import { User } from '../types';

// API key should be set in environment variables
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export interface TrainingData {
    id: string;
    tenderId: string;
    features: TenderFeatures;
    outcome: TenderOutcome;
    createdAt: Date;
    companyId?: string;
    userId: string;
}

export interface TenderFeatures {
    // Tender characteristics
    estimatedValue: number;
    sector: string;
    region: string;
    complexity: 1 | 2 | 3 | 4 | 5; // 1 = simple, 5 = highly complex
    
    // Competition analysis
    competitorCount: number;
    marketSaturation: number; // 0-1 scale
    
    // Company capabilities
    relevantExperience: number; // years
    portfolioMatch: number; // 0-1 similarity score
    teamCapacity: number; // 0-1 availability
    
    // Historical performance
    recentWinRate: number; // 0-1 in similar tenders
    avgBidRatio: number; // our bid / winning bid average
    
    // Timing factors
    preparationTime: number; // days available
    seasonality: number; // 0-1 seasonal demand factor
    
    // Requirements matching
    technicalMatch: number; // 0-1 technical capability match
    certificationMatch: number; // 0-1 required certifications match
    geographicAdvantage: number; // 0-1 location advantage
}

export interface TenderOutcome {
    submitted: boolean;
    won: boolean;
    finalRank?: number;
    bidValue?: number;
    winningBid?: number;
    feedback?: string;
    profitMargin?: number;
}

export interface MLModel {
    id: string;
    name: string;
    type: 'classification' | 'regression' | 'recommendation';
    version: string;
    accuracy: number;
    trainingDataCount: number;
    lastTrained: Date;
    isActive: boolean;
    hyperparameters: Record<string, any>;
    features: string[];
    companyId?: string; // for tenant-specific models
}

export interface PredictionResult {
    tenderId: string;
    model: string;
    prediction: {
        winProbability: number;
        recommendedBid?: number;
        confidenceScore: number;
        riskFactors: string[];
        recommendations: string[];
    };
    explanation: string;
    createdAt: Date;
}

export interface ModelPerformance {
    modelId: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
    confusionMatrix: number[][];
    lastEvaluated: Date;
}

export class MachineLearningService {
    private models: MLModel[] = [];
    private trainingData: TrainingData[] = [];
    private predictions: PredictionResult[] = [];

    constructor() {
        this.initializeDefaultModels();
        this.loadStoredData();
    }

    private initializeDefaultModels(): void {
        this.models = [
            {
                id: 'win-predictor-v1',
                name: 'Tender Win Probability Predictor',
                type: 'classification',
                version: '1.0.0',
                accuracy: 0.847,
                trainingDataCount: 1250,
                lastTrained: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
                isActive: true,
                hyperparameters: {
                    learningRate: 0.001,
                    batchSize: 32,
                    epochs: 100,
                    dropoutRate: 0.2,
                },
                features: [
                    'estimatedValue', 'complexity', 'competitorCount', 'relevantExperience',
                    'portfolioMatch', 'technicalMatch', 'geographicAdvantage', 'preparationTime'
                ],
            },
            {
                id: 'bid-optimizer-v1',
                name: 'Optimal Bid Value Predictor',
                type: 'regression',
                version: '1.0.0',
                accuracy: 0.792,
                trainingDataCount: 980,
                lastTrained: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                isActive: true,
                hyperparameters: {
                    learningRate: 0.0005,
                    regularization: 0.01,
                    hiddenLayers: [128, 64, 32],
                },
                features: [
                    'estimatedValue', 'sector', 'competitorCount', 'avgBidRatio',
                    'marketSaturation', 'seasonality', 'geographicAdvantage'
                ],
            },
            {
                id: 'tender-recommender-v1',
                name: 'Tender Opportunity Recommender',
                type: 'recommendation',
                version: '1.0.0',
                accuracy: 0.763,
                trainingDataCount: 2100,
                lastTrained: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
                isActive: true,
                hyperparameters: {
                    embeddingDim: 50,
                    numFactors: 100,
                    regularization: 0.02,
                },
                features: [
                    'sector', 'estimatedValue', 'complexity', 'region',
                    'technicalMatch', 'portfolioMatch', 'recentWinRate'
                ],
            },
        ];
    }

    private loadStoredData(): void {
        try {
            const storedModels = localStorage.getItem('ml_models');
            const storedTrainingData = localStorage.getItem('ml_training_data');
            const storedPredictions = localStorage.getItem('ml_predictions');

            if (storedModels) {
                const parsed = JSON.parse(storedModels);
                this.models = parsed.map((model: any) => ({
                    ...model,
                    lastTrained: new Date(model.lastTrained),
                }));
            }

            if (storedTrainingData) {
                const parsed = JSON.parse(storedTrainingData);
                this.trainingData = parsed.map((data: any) => ({
                    ...data,
                    createdAt: new Date(data.createdAt),
                }));
            }

            if (storedPredictions) {
                const parsed = JSON.parse(storedPredictions);
                this.predictions = parsed.map((pred: any) => ({
                    ...pred,
                    createdAt: new Date(pred.createdAt),
                }));
            }
        } catch (error) {
            console.error('Error loading ML data:', error);
        }
    }

    private saveStoredData(): void {
        try {
            localStorage.setItem('ml_models', JSON.stringify(this.models));
            localStorage.setItem('ml_training_data', JSON.stringify(this.trainingData));
            localStorage.setItem('ml_predictions', JSON.stringify(this.predictions));
        } catch (error) {
            console.error('Error saving ML data:', error);
        }
    }

    // Extract features from tender opportunity
    async extractTenderFeatures(
        tender: TenderOpportunity, 
        user: User,
        historicalData?: AnalysisReport[]
    ): Promise<TenderFeatures> {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        try {
            const prompt = `
                Analyze this tender opportunity and extract ML features:
                
                Tender: ${tender.title}
                Value: $${tender.estimatedValue}
                Sector: ${tender.sector}
                Region: ${tender.region}
                Description: ${tender.description}
                Requirements: ${tender.requirements.join(', ')}
                
                Historical Performance: ${historicalData?.length || 0} previous analyses
                
                Extract and return JSON with these features (0-1 scale where applicable):
                {
                    "complexity": 1-5 (1=simple, 5=highly complex),
                    "competitorCount": estimated number of competitors,
                    "marketSaturation": 0-1 (market competition level),
                    "relevantExperience": estimated years needed,
                    "portfolioMatch": 0-1 (how well it matches typical projects),
                    "teamCapacity": 0-1 (estimated resource availability),
                    "recentWinRate": 0-1 (estimated win rate in similar tenders),
                    "avgBidRatio": 0.8-1.2 (typical bid competitiveness),
                    "preparationTime": days until deadline,
                    "seasonality": 0-1 (seasonal demand factor),
                    "technicalMatch": 0-1 (technical capability match),
                    "certificationMatch": 0-1 (required certifications match),
                    "geographicAdvantage": 0-1 (location advantage)
                }
                
                Return only the JSON object.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const featuresText = response.text().trim();
            
            // Parse AI response and fill in any missing values
            let features: Partial<TenderFeatures>;
            try {
                features = JSON.parse(featuresText);
            } catch {
                // Fallback to estimated values if AI parsing fails
                features = {};
            }

            // Ensure all required features are present with reasonable defaults
            const extractedFeatures: TenderFeatures = {
                estimatedValue: tender.estimatedValue,
                sector: tender.sector,
                region: tender.region,
                complexity: features.complexity || this.estimateComplexity(tender),
                competitorCount: features.competitorCount || this.estimateCompetitors(tender),
                marketSaturation: features.marketSaturation || 0.6,
                relevantExperience: features.relevantExperience || 5,
                portfolioMatch: features.portfolioMatch || 0.7,
                teamCapacity: features.teamCapacity || 0.8,
                recentWinRate: features.recentWinRate || 0.15,
                avgBidRatio: features.avgBidRatio || 0.95,
                preparationTime: this.calculatePreparationTime(tender.deadline),
                seasonality: features.seasonality || 0.5,
                technicalMatch: features.technicalMatch || 0.75,
                certificationMatch: features.certificationMatch || 0.8,
                geographicAdvantage: features.geographicAdvantage || 0.6,
            };

            return extractedFeatures;
        } catch (error) {
            console.error('Error extracting tender features:', error);
            
            // Return reasonable default features if AI extraction fails
            return {
                estimatedValue: tender.estimatedValue,
                sector: tender.sector,
                region: tender.region,
                complexity: this.estimateComplexity(tender),
                competitorCount: this.estimateCompetitors(tender),
                marketSaturation: 0.6,
                relevantExperience: 5,
                portfolioMatch: 0.7,
                teamCapacity: 0.8,
                recentWinRate: 0.15,
                avgBidRatio: 0.95,
                preparationTime: this.calculatePreparationTime(tender.deadline),
                seasonality: 0.5,
                technicalMatch: 0.75,
                certificationMatch: 0.8,
                geographicAdvantage: 0.6,
            };
        }
    }

    private estimateComplexity(tender: TenderOpportunity): 1 | 2 | 3 | 4 | 5 {
        const value = tender.estimatedValue;
        const requirements = tender.requirements.length;
        const description = tender.description.toLowerCase();
        
        let complexity = 1;
        
        // Value-based complexity
        if (value > 10000000) complexity += 2;
        else if (value > 5000000) complexity += 1;
        
        // Requirements complexity
        if (requirements > 10) complexity += 1;
        if (requirements > 20) complexity += 1;
        
        // Keyword-based complexity
        const complexKeywords = ['integration', 'custom', 'specialized', 'advanced', 'complex'];
        if (complexKeywords.some(keyword => description.includes(keyword))) {
            complexity += 1;
        }
        
        return Math.min(Math.max(complexity, 1), 5) as 1 | 2 | 3 | 4 | 5;
    }

    private estimateCompetitors(tender: TenderOpportunity): number {
        const value = tender.estimatedValue;
        const sector = tender.sector.toLowerCase();
        
        let baseCompetitors = 8; // average
        
        // High-value tenders attract more competitors
        if (value > 20000000) baseCompetitors += 5;
        else if (value > 10000000) baseCompetitors += 3;
        else if (value < 1000000) baseCompetitors -= 2;
        
        // Sector-specific adjustments
        if (sector.includes('construction') || sector.includes('infrastructure')) {
            baseCompetitors += 2;
        }
        if (sector.includes('specialized') || sector.includes('niche')) {
            baseCompetitors -= 3;
        }
        
        return Math.max(baseCompetitors, 2);
    }

    private calculatePreparationTime(deadline: Date): number {
        const now = new Date();
        const diffTime = deadline.getTime() - now.getTime();
        return Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 0);
    }

    // Predict tender win probability
    async predictWinProbability(
        tender: TenderOpportunity,
        user: User,
        historicalData?: AnalysisReport[]
    ): Promise<PredictionResult> {
        const model = this.models.find(m => m.id === 'win-predictor-v1' && m.isActive);
        if (!model) {
            throw new Error('Win probability prediction model not available');
        }

        const features = await this.extractTenderFeatures(tender, user, historicalData);
        
        // Simulate ML prediction (in production, this would call actual ML model)
        const prediction = await this.simulateMLPrediction(features, model);
        
        const result: PredictionResult = {
            tenderId: tender.id,
            model: model.id,
            prediction: {
                winProbability: prediction.winProbability,
                confidenceScore: prediction.confidence,
                riskFactors: this.identifyRiskFactors(features),
                recommendations: await this.generateRecommendations(features, prediction),
            },
            explanation: await this.explainPrediction(features, prediction),
            createdAt: new Date(),
        };

        this.predictions.push(result);
        this.saveStoredData();

        return result;
    }

    // Predict optimal bid value
    async predictOptimalBid(
        tender: TenderOpportunity,
        user: User,
        historicalData?: AnalysisReport[]
    ): Promise<PredictionResult> {
        const model = this.models.find(m => m.id === 'bid-optimizer-v1' && m.isActive);
        if (!model) {
            throw new Error('Bid optimization model not available');
        }

        const features = await this.extractTenderFeatures(tender, user, historicalData);
        
        // Simulate ML prediction
        const prediction = await this.simulateMLPrediction(features, model);
        
        const result: PredictionResult = {
            tenderId: tender.id,
            model: model.id,
            prediction: {
                winProbability: prediction.winProbability,
                recommendedBid: prediction.recommendedBid,
                confidenceScore: prediction.confidence,
                riskFactors: this.identifyRiskFactors(features),
                recommendations: await this.generateBidRecommendations(features, prediction),
            },
            explanation: await this.explainBidPrediction(features, prediction),
            createdAt: new Date(),
        };

        this.predictions.push(result);
        this.saveStoredData();

        return result;
    }

    // Simulate ML model prediction (replace with actual ML inference in production)
    private async simulateMLPrediction(
        features: TenderFeatures,
        model: MLModel
    ): Promise<{ winProbability: number; recommendedBid?: number; confidence: number }> {
        // Simulate ML processing delay
        await new Promise(resolve => setTimeout(resolve, 500));

        let winProbability = 0.5;
        let confidence = 0.8;

        // Feature-based probability calculation (simplified)
        const relevanceScore = (
            features.portfolioMatch * 0.25 +
            features.technicalMatch * 0.2 +
            features.geographicAdvantage * 0.15 +
            features.certificationMatch * 0.15 +
            (features.recentWinRate || 0.15) * 0.25
        );

        const competitionPenalty = Math.min(features.competitorCount / 20, 0.3);
        const timePenalty = features.preparationTime < 14 ? 0.1 : 0;
        const complexityBonus = features.complexity <= 3 ? 0.1 : 0;

        winProbability = Math.max(0.05, Math.min(0.95, 
            relevanceScore - competitionPenalty - timePenalty + complexityBonus
        ));

        // Adjust confidence based on feature quality
        confidence = Math.min(0.95, 
            0.6 + (features.portfolioMatch * 0.2) + (features.technicalMatch * 0.15)
        );

        let recommendedBid: number | undefined;
        if (model.type === 'regression') {
            // Bid optimization logic
            const baseBid = features.estimatedValue * 0.92; // start at 92% of estimated value
            const competitiveAdjustment = features.competitorCount > 10 ? 0.95 : 1.0;
            const urgencyAdjustment = features.preparationTime < 7 ? 1.02 : 1.0;
            
            recommendedBid = baseBid * competitiveAdjustment * urgencyAdjustment;
        }

        return { winProbability, recommendedBid, confidence };
    }

    private identifyRiskFactors(features: TenderFeatures): string[] {
        const risks: string[] = [];

        if (features.competitorCount > 15) {
            risks.push('High competition - many bidders expected');
        }
        if (features.preparationTime < 14) {
            risks.push('Limited preparation time');
        }
        if (features.portfolioMatch < 0.6) {
            risks.push('Limited relevant experience');
        }
        if (features.technicalMatch < 0.7) {
            risks.push('Technical capability gaps');
        }
        if (features.complexity >= 4) {
            risks.push('High project complexity');
        }
        if (features.teamCapacity < 0.5) {
            risks.push('Resource constraints');
        }

        return risks;
    }

    private async generateRecommendations(
        features: TenderFeatures,
        prediction: { winProbability: number; confidence: number }
    ): Promise<string[]> {
        const recommendations: string[] = [];

        if (prediction.winProbability > 0.7) {
            recommendations.push('Strong opportunity - prioritize this tender');
        } else if (prediction.winProbability < 0.3) {
            recommendations.push('Low probability - consider whether to pursue');
        }

        if (features.preparationTime < 14) {
            recommendations.push('Allocate additional resources due to tight timeline');
        }
        if (features.portfolioMatch < 0.7) {
            recommendations.push('Highlight transferable skills and partnerships');
        }
        if (features.technicalMatch < 0.7) {
            recommendations.push('Consider technical partnerships or subcontracting');
        }
        if (features.competitorCount > 12) {
            recommendations.push('Develop strong differentiation strategy');
        }

        return recommendations;
    }

    private async generateBidRecommendations(
        features: TenderFeatures,
        prediction: { recommendedBid?: number; confidence: number }
    ): Promise<string[]> {
        const recommendations: string[] = [];

        if (prediction.recommendedBid) {
            const percentage = (prediction.recommendedBid / features.estimatedValue) * 100;
            recommendations.push(`Recommended bid: ${percentage.toFixed(1)}% of estimated value`);
        }

        if (features.competitorCount > 10) {
            recommendations.push('Consider aggressive pricing due to high competition');
        }
        if (features.preparationTime < 7) {
            recommendations.push('Add contingency for rushed timeline');
        }
        if (features.complexity >= 4) {
            recommendations.push('Include adequate margins for complexity risks');
        }

        return recommendations;
    }

    private async explainPrediction(
        features: TenderFeatures,
        prediction: { winProbability: number; confidence: number }
    ): Promise<string> {
        return `Prediction based on ${features.portfolioMatch > 0.8 ? 'strong' : 'moderate'} portfolio match (${(features.portfolioMatch * 100).toFixed(0)}%), ${features.technicalMatch > 0.8 ? 'excellent' : 'good'} technical fit (${(features.technicalMatch * 100).toFixed(0)}%), and ${features.competitorCount} estimated competitors. Win probability: ${(prediction.winProbability * 100).toFixed(1)}% with ${(prediction.confidence * 100).toFixed(0)}% confidence.`;
    }

    private async explainBidPrediction(
        features: TenderFeatures,
        prediction: { recommendedBid?: number; confidence: number }
    ): Promise<string> {
        if (!prediction.recommendedBid) return 'Bid optimization not available';
        
        const percentage = (prediction.recommendedBid / features.estimatedValue) * 100;
        return `Recommended bid of $${prediction.recommendedBid.toLocaleString()} (${percentage.toFixed(1)}% of estimated value) based on competitive analysis of ${features.competitorCount} competitors, ${features.complexity}/5 complexity rating, and market positioning factors.`;
    }

    // Add training data
    async addTrainingData(
        tender: TenderOpportunity,
        analysis: AnalysisReport,
        outcome: TenderOutcome,
        user: User
    ): Promise<TrainingData> {
        const features = await this.extractTenderFeatures(tender, user);
        
        const trainingRecord: TrainingData = {
            id: `training-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            tenderId: tender.id,
            features,
            outcome,
            createdAt: new Date(),
            companyId: user.companyId,
            userId: user.id,
        };

        this.trainingData.push(trainingRecord);
        this.saveStoredData();

        // Trigger model retraining if enough new data
        if (this.trainingData.length % 50 === 0) {
            await this.scheduleModelRetraining();
        }

        return trainingRecord;
    }

    // Schedule model retraining
    private async scheduleModelRetraining(): Promise<void> {
        console.log('🤖 Scheduling ML model retraining with new data...');
        
        // In production, this would trigger actual model retraining
        // For now, simulate by updating model accuracy and training date
        this.models.forEach(model => {
            model.trainingDataCount = this.trainingData.filter(d => 
                model.companyId ? d.companyId === model.companyId : true
            ).length;
            
            // Simulate slight accuracy improvement with more data
            model.accuracy = Math.min(0.95, model.accuracy + 0.001);
            model.lastTrained = new Date();
        });

        this.saveStoredData();
    }

    // Get model performance metrics
    getModelPerformance(modelId: string): ModelPerformance | null {
        const model = this.models.find(m => m.id === modelId);
        if (!model) return null;

        // Simulate performance metrics (in production, calculate from validation data)
        return {
            modelId,
            accuracy: model.accuracy,
            precision: model.accuracy * 0.95,
            recall: model.accuracy * 0.92,
            f1Score: model.accuracy * 0.93,
            auc: model.accuracy * 0.96,
            confusionMatrix: [
                [85, 15],
                [12, 88]
            ],
            lastEvaluated: model.lastTrained,
        };
    }

    // Get training data for a company
    getTrainingData(companyId?: string, limit?: number): TrainingData[] {
        let data = companyId 
            ? this.trainingData.filter(d => d.companyId === companyId)
            : this.trainingData;
        
        if (limit) {
            data = data.slice(-limit);
        }
        
        return data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Get predictions for a tender
    getPredictions(tenderId: string): PredictionResult[] {
        return this.predictions
            .filter(p => p.tenderId === tenderId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Get all models
    getModels(companyId?: string): MLModel[] {
        return this.models.filter(m => 
            companyId ? (m.companyId === companyId || !m.companyId) : true
        );
    }

    // Get ML service statistics
    getStatistics(companyId?: string): {
        totalModels: number;
        activeModels: number;
        totalPredictions: number;
        totalTrainingData: number;
        avgAccuracy: number;
        lastPrediction: Date | null;
    } {
        const models = this.getModels(companyId);
        const trainingData = this.getTrainingData(companyId);
        const predictions = companyId 
            ? this.predictions.filter(p => trainingData.some(td => td.tenderId === p.tenderId))
            : this.predictions;

        return {
            totalModels: models.length,
            activeModels: models.filter(m => m.isActive).length,
            totalPredictions: predictions.length,
            totalTrainingData: trainingData.length,
            avgAccuracy: models.reduce((sum, m) => sum + m.accuracy, 0) / models.length || 0,
            lastPrediction: predictions.length > 0 
                ? predictions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
                : null,
        };
    }
}

// Export singleton instance
export const machineLearningService = new MachineLearningService();