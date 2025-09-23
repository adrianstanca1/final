import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { TenderOpportunity, AnalysisReport, WinStrategy, TenderResponse } from '../types/procurement';
import { AnalystAgent, StrategistAgent, WriterAgent } from '../services/procurementAgents';
import { User, Role } from '../types';

interface ProcurementChainProps {
    tenders: TenderOpportunity[];
    onAnalysisComplete?: (analysis: AnalysisReport) => void;
    user: User;
    databaseContext: 'platform' | 'company';
}

export const ProcurementChain: React.FC<ProcurementChainProps> = ({ tenders, onAnalysisComplete, user, databaseContext }) => {
    const [selectedTender,                                                            <div className="bg-green-500 h-2 rounded-full w-5/12"></div>setSelec < div className = "bg-green-500 h-2 rounded-full w-4/12" ></div > edTender < div className = "bg-green-500 h-2 rounded-full w-3/12" ></div > = useSt < div className = "bg-green-500 h-2 rounded-full w-1/4" ></div > te<TenderOpportunity | null>(null);
    const [analysis, setAnalysis] = useState<AnalysisReport | null>(null);
    const [strategy, setStrategy] = useState<WinStrategy | null>(null);
    const [response, setResponse] = useState<TenderResponse | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState<'select' | 'analyze' | 'strategize' | 'write' | 'complete'>('select');
    const [activeTab, setActiveTab] = useState<'analysis' | 'strategy' | 'response' | 'analytics'>('analysis');
    const [progressDetails, setProgressDetails] = useState<{
        currentOperation: string;
        progress: number;
        timeRemaining: number;
        startTime: number;
    } | null>(null);

    // Advanced filtering state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [valueRange, setValueRange] = useState<{ min: number; max: number }>({ min: 0, max: 50000000 });
    const [selectedLocation, setSelectedLocation] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'deadline' | 'value' | 'title'>('deadline');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showFilters, setShowFilters] = useState(false);

    // Filter data arrays
    const categories = [
        'Construction', 'Infrastructure', 'Commercial', 'Residential',
        'Industrial', 'Public Works', 'Energy', 'Transportation'
    ];

    const locations = [
        'California', 'Texas', 'Florida', 'New York', 'Illinois',
        'Pennsylvania', 'Ohio', 'Georgia', 'North Carolina', 'Michigan'
    ];

    // Filter tenders based on user role and database context
    const roleFilteredTenders = user.role === Role.PRINCIPAL_ADMIN
        ? tenders // Platform admins see all tenders
        : tenders.filter(tender =>
            // Company owners see only tenders relevant to their company/region
            tender.location.includes('Kent') || tender.location.includes('Essex') || tender.location.includes('London')
        );

    // Further filter by search, category, value range, location, and sort
    const availableTenders = roleFilteredTenders
        .filter(tender => {
            // Search filter
            if (searchTerm && !tender.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
                !tender.description.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }

            // Category filter
            if (selectedCategory !== 'all' && tender.category !== selectedCategory) {
                return false;
            }

            // Value range filter
            if (tender.value < valueRange.min || tender.value > valueRange.max) {
                return false;
            }

            // Location filter
            if (selectedLocation !== 'all' && !tender.location.includes(selectedLocation)) {
                return false;
            }

            return true;
        })
        .sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'deadline':
                    comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                    break;
                case 'value':
                    comparison = a.value - b.value;
                    break;
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

    const analystAgent = new AnalystAgent();
    const strategistAgent = new StrategistAgent();
    const writerAgent = new WriterAgent();

    const runFullChain = async (tender: TenderOpportunity) => {
        if (!tender) return;

        const startTime = Date.now();
        setIsProcessing(true);
        setSelectedTender(tender);
        setCurrentStep('analyze');
        setProgressDetails({
            currentOperation: 'Initializing AI analysis...',
            progress: 0,
            timeRemaining: 180, // 3 minutes estimated
            startTime
        });

        try {
            // Step 1: Analysis
            setProgressDetails(prev => prev ? {
                ...prev,
                currentOperation: 'Analyzing tender requirements and company capabilities...',
                progress: 10,
                timeRemaining: 150
            } : null);

            const analysisResult = await analystAgent.analyzeTender(tender);
            setAnalysis(analysisResult);
            setCurrentStep('strategize');

            setProgressDetails(prev => prev ? {
                ...prev,
                currentOperation: 'Analysis complete. Developing win strategy...',
                progress: 40,
                timeRemaining: 120
            } : null);

            if (onAnalysisComplete) {
                onAnalysisComplete(analysisResult);
            }

            // Step 2: Strategy
            console.log('Developing win strategy...');
            const strategyResult = await strategistAgent.developStrategy(tender, analysisResult);
            setStrategy(strategyResult);
            setCurrentStep('write');

            // Step 3: Writing
            console.log('Drafting tender response...');
            const responseResult = await writerAgent.draftResponse(tender, analysisResult, strategyResult);
            setResponse(responseResult);
            setCurrentStep('complete');

            console.log('Procurement analysis complete!');
        } catch (error) {
            console.error('Procurement chain error:', error);
            setProgressDetails(prev => prev ? {
                ...prev,
                currentOperation: 'Analysis failed. Please try again.',
                progress: 0,
                timeRemaining: 0
            } : null);
        } finally {
            setIsProcessing(false);
            // Clear progress after 3 seconds if successful
            if (currentStep === 'complete') {
                setTimeout(() => setProgressDetails(null), 3000);
            }
        }
    };

    const getMatchScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getRecommendationColor = (recommendation: string) => {
        const colors = {
            highly_recommended: 'bg-green-100 text-green-800 px-2 py-1 rounded',
            recommended: 'bg-blue-100 text-blue-800 px-2 py-1 rounded',
            consider: 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded',
            not_recommended: 'bg-red-100 text-red-800 px-2 py-1 rounded'
        };
        return colors[recommendation as keyof typeof colors] || colors.consider;
    };

    const downloadDocument = () => {
        if (!response || !selectedTender) return;

        const content = `# Tender Response: ${selectedTender.title}

${response.fullDocument}

---
Generated by AI Procurement System on ${new Date(response.generatedAt).toLocaleDateString()}
`;

        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tender-response-${selectedTender.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const resetChain = () => {
        setSelectedTender(null);
        setAnalysis(null);
        setStrategy(null);
        setResponse(null);
        setCurrentStep('select');
        setActiveTab('analysis');
        setProgressDetails(null);
    };

    return (
        <div className="space-y-6">
            {/* Database Context Indicator */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${databaseContext === 'platform' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                        <span className="font-medium text-gray-900">
                            {databaseContext === 'platform' ? '🌐 Platform Database' : '🏢 Company Database'}
                        </span>
                        <span className="text-sm text-gray-600">
                            ({availableTenders.length} tender{availableTenders.length !== 1 ? 's' : ''} available)
                        </span>
                    </div>
                    <div className="text-sm text-gray-500">
                        {user.role === Role.PRINCIPAL_ADMIN ? 'All Companies Access' : `${user.companyId || 'Local'} Company Only`}
                    </div>
                </div>
            </div>

            {/* Header */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">🧠 AI Procurement Analysis Chain</h2>
                        {isProcessing && (
                            <div className="flex items-center gap-2 text-blue-600">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                Processing...
                            </div>
                        )}
                        {selectedTender && (
                            <Button variant="secondary" onClick={resetChain}>
                                Start New Analysis
                            </Button>
                        )}
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center gap-4">
                        {[
                            { id: 'select', label: 'Select Tender' },
                            { id: 'analyze', label: 'Analyze' },
                            { id: 'strategize', label: 'Strategy' },
                            { id: 'write', label: 'Draft' },
                            { id: 'complete', label: 'Complete' }
                        ].map((step, index) => {
                            const isActive = currentStep === step.id;
                            const isCompleted = ['select', 'analyze', 'strategize', 'write'].indexOf(currentStep) > ['select', 'analyze', 'strategize', 'write'].indexOf(step.id);

                            return (
                                <div key={step.id} className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${isCompleted ? 'bg-green-100 text-green-600' :
                                        isActive ? 'bg-blue-100 text-blue-600' :
                                            'bg-gray-100 text-gray-400'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <span className={`text-sm ${isCompleted ? 'text-green-600' :
                                        isActive ? 'text-blue-600' :
                                            'text-gray-400'
                                        }`}>
                                        {step.label}
                                    </span>
                                    {index < 4 && <div className="w-8 h-0.5 bg-gray-200" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Card>

            {/* Tender Selection */}
            {currentStep === 'select' && (
                <Card>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Select Tender for Analysis</h3>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                                {showFilters ? 'Hide Filters' : 'Show Filters & Search'}
                            </button>
                        </div>

                        {/* Advanced Filtering UI */}
                        {showFilters && (
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                                {/* Search */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Search Tenders
                                    </label>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search by title or description..."
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Category Filter */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Category
                                        </label>
                                        <select
                                            value={selectedCategory}
                                            onChange={(e) => setSelectedCategory(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm"
                                            aria-label="Filter by category"
                                        >
                                            <option value="all">All Categories</option>
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Location Filter */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Location
                                        </label>
                                        <select
                                            value={selectedLocation}
                                            onChange={(e) => setSelectedLocation(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm"
                                            aria-label="Filter by location"
                                        >
                                            <option value="all">All Locations</option>
                                            {locations.map(loc => (
                                                <option key={loc} value={loc}>{loc}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Sort By */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Sort By
                                        </label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as 'deadline' | 'value' | 'title')}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm"
                                            aria-label="Sort tenders by"
                                        >
                                            <option value="deadline">Deadline</option>
                                            <option value="value">Value</option>
                                            <option value="title">Title</option>
                                        </select>
                                    </div>

                                    {/* Sort Order */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Order
                                        </label>
                                        <select
                                            value={sortOrder}
                                            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm"
                                            aria-label="Sort order"
                                        >
                                            <option value="asc">Ascending</option>
                                            <option value="desc">Descending</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Value Range */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Value Range (£)
                                    </label>
                                    <div className="flex items-center space-x-4">
                                        <input
                                            type="number"
                                            value={valueRange.min}
                                            onChange={(e) => setValueRange(prev => ({ ...prev, min: parseInt(e.target.value) || 0 }))}
                                            placeholder="Min value"
                                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                                        />
                                        <span className="text-gray-500">to</span>
                                        <input
                                            type="number"
                                            value={valueRange.max}
                                            onChange={(e) => setValueRange(prev => ({ ...prev, max: parseInt(e.target.value) || 50000000 }))}
                                            placeholder="Max value"
                                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Results Summary */}
                        <div className="mb-4 text-sm text-gray-600">
                            Showing {availableTenders.length} of {roleFilteredTenders.length} tender{availableTenders.length !== 1 ? 's' : ''}
                        </div>

                        {availableTenders.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p className="mb-2">No tender opportunities available in your database context.</p>
                                {user.role !== Role.PRINCIPAL_ADMIN && (
                                    <p className="text-sm">Company owners see tenders filtered by region. Contact platform admin for full access.</p>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {availableTenders.map((tender) => (
                                    <Card key={tender.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => runFullChain(tender)}>
                                        <div className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-slate-900">{tender.title}</h4>
                                                    <p className="text-sm text-slate-600 mt-1">{tender.client}</p>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                                        <span>£{tender.value.toLocaleString()}</span>
                                                        <span>{tender.location}</span>
                                                        <span>Deadline: {new Date(tender.deadline).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                                                    {tender.category}
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Results */}
            {analysis && selectedTender && (
                <div className="space-y-4">
                    {/* Tab Navigation */}
                    <Card>
                        <div className="p-4 border-b">
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setActiveTab('analysis')}
                                    className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'analysis' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    Analysis Report
                                </button>
                                {strategy && (
                                    <button
                                        onClick={() => setActiveTab('strategy')}
                                        className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'strategy' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        Win Strategy
                                    </button>
                                )}
                                {response && (
                                    <button
                                        onClick={() => setActiveTab('response')}
                                        className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'response' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        Tender Response
                                    </button>
                                )}
                                <button
                                    onClick={() => setActiveTab('analytics')}
                                    className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'analytics' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    Historical Analytics
                                </button>
                            </div>
                        </div>

                        {/* Analysis Tab */}
                        {activeTab === 'analysis' && (
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">Feasibility Analysis</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-600">Match Score:</span>
                                        <span className={`text-2xl font-bold ${getMatchScoreColor(analysis.matchScore)}`}>
                                            {analysis.matchScore}%
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <span className={getRecommendationColor(analysis.recommendation)}>
                                        {analysis.recommendation.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <h4 className="font-semibold text-green-700 mb-2">✅ Our Strengths</h4>
                                        <ul className="space-y-1">
                                            {analysis.ourStrengths.map((strength, idx) => (
                                                <li key={idx} className="text-sm text-slate-600">• {strength}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-orange-700 mb-2">⚠️ Potential Gaps</h4>
                                        <ul className="space-y-1">
                                            {analysis.potentialGaps.map((gap, idx) => (
                                                <li key={idx} className="text-sm text-slate-600">• {gap}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="font-semibold mb-2">Key Requirements</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.keyRequirements.map((req, idx) => (
                                            <span key={idx} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                                                {req}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <h4 className="font-semibold mb-2">Detailed Analysis</h4>
                                    <p className="text-sm text-slate-600 whitespace-pre-line">{analysis.analysis}</p>
                                </div>
                            </div>
                        )}

                        {/* Strategy Tab */}
                        {activeTab === 'strategy' && strategy && (
                            <div className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Win Strategy</h3>

                                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                                    <h4 className="font-semibold text-blue-800 mb-2">🎯 Win Theme</h4>
                                    <p className="text-blue-700 font-medium">{strategy.winTheme}</p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-semibold mb-3">🔑 Key Selling Points</h4>
                                        <div className="space-y-3">
                                            {strategy.keySellingPoints.map((point, idx) => (
                                                <div key={idx} className="border rounded-lg p-3">
                                                    <div className="font-medium text-slate-900">{point.point}</div>
                                                    <div className="text-sm text-slate-600 mt-1">
                                                        <strong>Relevance:</strong> {point.relevance}
                                                    </div>
                                                    <div className="text-sm text-slate-600 mt-1">
                                                        <strong>Evidence:</strong> {point.evidence}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold mb-3">🛡️ Risk Mitigation</h4>
                                        <div className="space-y-2">
                                            {strategy.riskMitigation.map((item, idx) => (
                                                <div key={idx} className="flex gap-3 p-3 bg-yellow-50 rounded-lg">
                                                    <span className="text-yellow-600 font-bold">⚠️</span>
                                                    <div>
                                                        <div className="font-medium text-yellow-800">{item.risk}</div>
                                                        <div className="text-sm text-yellow-700 mt-1">{item.mitigation}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold mb-3">📋 Evidence to Include</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {strategy.evidenceToInclude.map((evidence, idx) => (
                                                <span key={idx} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                                                    {evidence}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Response Tab */}
                        {activeTab === 'response' && response && (
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">📝 Tender Response Draft</h3>
                                    <Button onClick={downloadDocument}>
                                        💾 Download Document
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <h4 className="font-semibold mb-2">Executive Summary</h4>
                                        <p className="text-sm text-slate-600">{response.executiveSummary}</p>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="p-4 border rounded-lg">
                                            <h4 className="font-semibold mb-2">Understanding of Requirements</h4>
                                            <p className="text-sm text-slate-600">{response.understandingOfRequirements}</p>
                                        </div>

                                        <div className="p-4 border rounded-lg">
                                            <h4 className="font-semibold mb-2">Risk Management</h4>
                                            <p className="text-sm text-slate-600">{response.riskManagement}</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-green-50 rounded-lg">
                                        <h4 className="font-semibold text-green-800 mb-2">Conclusion</h4>
                                        <p className="text-sm text-green-700">{response.conclusion}</p>
                                    </div>

                                    <div className="border rounded-lg p-4">
                                        <h4 className="font-semibold mb-2">Full Document Preview</h4>
                                        <div className="max-h-64 overflow-y-auto p-3 bg-white border rounded text-sm">
                                            <pre className="whitespace-pre-wrap">{response.fullDocument}</pre>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Historical Analytics Tab */}
                        {activeTab === 'analytics' && (
                            <div className="p-6">
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold mb-4">Historical Analytics & Performance</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                        {/* Key Metrics */}
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-blue-600">87</div>
                                            <div className="text-sm text-gray-600">Total Analyses</div>
                                        </div>
                                        <div className="bg-green-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-green-600">34%</div>
                                            <div className="text-sm text-gray-600">Win Rate</div>
                                        </div>
                                        <div className="bg-orange-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-orange-600">£2.1M</div>
                                            <div className="text-sm text-gray-600">Avg. Tender Value</div>
                                        </div>
                                        <div className="bg-purple-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-purple-600">4.2</div>
                                            <div className="text-sm text-gray-600">Avg. AI Confidence</div>
                                        </div>
                                    </div>

                                    {/* Performance Trends */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                        <div className="border rounded-lg p-4">
                                            <h4 className="font-semibold mb-3">Win Rate by Category</h4>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Construction</span>
                                                    <div className="flex items-center">
                                                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '42%' }}></div>
                                                        </div>
                                                        <span className="text-sm font-medium">42%</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Infrastructure</span>
                                                    <div className="flex items-center">
                                                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '38%' }}></div>
                                                        </div>
                                                        <span className="text-sm font-medium">38%</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Commercial</span>
                                                    <div className="flex items-center">
                                                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '29%' }}></div>
                                                        </div>
                                                        <span className="text-sm font-medium">29%</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Public Works</span>
                                                    <div className="flex items-center">
                                                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                                                        </div>
                                                        <span className="text-sm font-medium">25%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border rounded-lg p-4">
                                            <h4 className="font-semibold mb-3">Monthly Performance</h4>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">January 2024</span>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">12 analyses</span>
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">5 wins</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">February 2024</span>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">15 analyses</span>
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">6 wins</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">March 2024</span>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">18 analyses</span>
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">7 wins</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">April 2024</span>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">21 analyses</span>
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">8 wins</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recent Analysis History */}
                                    <div className="border rounded-lg p-4">
                                        <h4 className="font-semibold mb-3">Recent Analysis History</h4>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left py-2">Date</th>
                                                        <th className="text-left py-2">Tender</th>
                                                        <th className="text-left py-2">Category</th>
                                                        <th className="text-left py-2">Value</th>
                                                        <th className="text-left py-2">AI Score</th>
                                                        <th className="text-left py-2">Outcome</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    <tr>
                                                        <td className="py-2">2024-04-15</td>
                                                        <td className="py-2">Kent Hospital Extension</td>
                                                        <td className="py-2">Healthcare</td>
                                                        <td className="py-2">£850k</td>
                                                        <td className="py-2">
                                                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">4.2/5</span>
                                                        </td>
                                                        <td className="py-2">
                                                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Won</span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-2">2024-04-10</td>
                                                        <td className="py-2">London Bridge Repair</td>
                                                        <td className="py-2">Infrastructure</td>
                                                        <td className="py-2">£2.1M</td>
                                                        <td className="py-2">
                                                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">3.1/5</span>
                                                        </td>
                                                        <td className="py-2">
                                                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Lost</span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-2">2024-04-08</td>
                                                        <td className="py-2">Essex School Renovation</td>
                                                        <td className="py-2">Education</td>
                                                        <td className="py-2">£450k</td>
                                                        <td className="py-2">
                                                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">4.5/5</span>
                                                        </td>
                                                        <td className="py-2">
                                                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Won</span>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Insights & Recommendations */}
                                    <div className="mt-6 border rounded-lg p-4 bg-blue-50">
                                        <h4 className="font-semibold mb-3 text-blue-900">AI-Generated Insights</h4>
                                        <div className="space-y-2 text-sm text-blue-800">
                                            <p>• Your highest success rate is in Construction projects (42%), particularly those under £1M</p>
                                            <p>• Healthcare and Education sectors show strong performance with AI confidence scores above 4.0</p>
                                            <p>• Consider focusing on infrastructure projects with higher confidence scores to improve win rates</p>
                                            <p>• Your response quality has improved 15% over the last 3 months based on AI analysis</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
};