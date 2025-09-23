import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { TenderOpportunity, AnalysisReport, WinStrategy, TenderResponse } from '../types/procurement';
import { User } from '../types';

interface ProcurementChainProps {
    tenders: TenderOpportunity[];
    onAnalysisComplete?: (analysis: AnalysisReport) => void;
    user: User;
    databaseContext?: string;
}

// Real-time collaboration interfaces
interface Collaborator {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen: Date;
    role: string;
}

interface Comment {
    id: string;
    user: string;
    userId: string;
    text: string;
    timestamp: Date;
    section: string;
    replies?: Comment[];
    isEdited?: boolean;
    mentions?: string[];
    attachments?: { name: string; url: string; type: string }[];
}

interface LiveCursor {
    userId: string;
    userName: string;
    x: number;
    y: number;
    color: string;
}

export const ProcurementChain: React.FC<ProcurementChainProps> = ({
    tenders,
    onAnalysisComplete,
    user,
    databaseContext
}) => {
    const [selectedTender, setSelectedTender] = useState<TenderOpportunity | null>(null);
    const [analysis, setAnalysis] = useState<AnalysisReport | null>(null);
    const [strategy, setStrategy] = useState<WinStrategy | null>(null);
    const [response, setResponse] = useState<TenderResponse | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState<'select' | 'analyze' | 'strategize' | 'write' | 'complete'>('select');

    // Enhanced collaboration state
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [showComments, setShowComments] = useState(false);
    const [activeTab, setActiveTab] = useState<'analysis' | 'strategy' | 'response' | 'collaboration'>('analysis');
    const [liveCursors, setLiveCursors] = useState<LiveCursor[]>([]);
    const [isTyping, setIsTyping] = useState<{ [userId: string]: string }>({});
    const [notifications, setNotifications] = useState<Array<{ id: string, message: string, type: 'info' | 'success' | 'warning' | 'error', timestamp: Date }>>([]);

    // Real-time activity tracking
    const [recentActivity, setRecentActivity] = useState<Array<{
        id: string;
        user: string;
        action: string;
        timestamp: Date;
        details?: any;
    }>>([]);

    // Advanced export and AI confidence
    const [confidenceScore, setConfidenceScore] = useState<number>(0);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Initialize sample collaborators and activity
    useEffect(() => {
        const sampleCollaborators: Collaborator[] = [
            {
                id: '1',
                name: 'Sarah Johnson',
                isOnline: true,
                lastSeen: new Date(),
                role: 'Senior Analyst',
            },
            {
                id: '2',
                name: 'Michael Chen',
                isOnline: true,
                lastSeen: new Date(),
                role: 'Strategy Lead',
            },
            {
                id: '3',
                name: 'Emma Davis',
                isOnline: false,
                lastSeen: new Date(Date.now() - 5 * 60 * 1000),
                role: 'Bid Writer',
            }
        ];
        setCollaborators(sampleCollaborators);

        const sampleActivity = [
            {
                id: '1',
                user: 'Sarah Johnson',
                action: 'analyzed tender requirements',
                timestamp: new Date(Date.now() - 2 * 60 * 1000),
                details: 'Completed comprehensive analysis'
            },
            {
                id: '2',
                user: 'Michael Chen',
                action: 'updated win strategy',
                timestamp: new Date(Date.now() - 5 * 60 * 1000),
                details: 'Added competitive positioning'
            }
        ];
        setRecentActivity(sampleActivity);

        // Simulate confidence score calculation
        setConfidenceScore(85);
    }, []);

    const addComment = (section: string) => {
        if (!newComment.trim()) return;

        const comment: Comment = {
            id: Date.now().toString(),
            user: user.firstName ? `${user.firstName} ${user.lastName}` : user.email,
            userId: user.id,
            text: newComment,
            timestamp: new Date(),
            section,
            replies: []
        };

        setComments([...comments, comment]);
        setNewComment('');

        // Add to activity log
        const activity = {
            id: Date.now().toString(),
            user: comment.user,
            action: `commented on ${section}`,
            timestamp: new Date(),
            details: newComment.substring(0, 50) + (newComment.length > 50 ? '...' : '')
        };
        setRecentActivity([activity, ...recentActivity]);

        // Show notification
        setNotifications([...notifications, {
            id: Date.now().toString(),
            message: `New comment added to ${section}`,
            type: 'info',
            timestamp: new Date()
        }]);
    };

    const getSectionComments = (section: string) => {
        return comments.filter(comment => comment.section === section);
    };

    const getConfidenceColor = (score: number) => {
        if (score >= 85) return 'text-green-600';
        if (score >= 70) return 'text-blue-600';
        if (score >= 55) return 'text-yellow-600';
        return 'text-red-600';
    };

    const runMockAnalysis = async (tender: TenderOpportunity) => {
        setIsProcessing(true);
        setSelectedTender(tender);
        setCurrentStep('analyze');

        // Simulate AI analysis process
        await new Promise(resolve => setTimeout(resolve, 2000));

        const mockAnalysis: AnalysisReport = {
            tenderId: tender.id,
            matchScore: 88,
            keyRequirements: [
                'Commercial construction experience',
                'Project management certification',
                'Local workforce availability',
                'Sustainability credentials'
            ],
            ourStrengths: [
                'Award-winning commercial portfolio',
                'Certified project management team',
                'Strong local presence and workforce',
                'LEED-certified sustainability expertise'
            ],
            potentialGaps: [
                'Limited experience with specific building type',
                'Need for specialized subcontractors'
            ],
            risks: [
                'Tight timeline constraints',
                'Material cost volatility',
                'Weather-dependent activities'
            ],
            recommendation: 'highly_recommended',
            analysis: 'Excellent match with strong competitive positioning and manageable risks.',
            generatedAt: new Date().toISOString()
        };

        setAnalysis(mockAnalysis);
        setCurrentStep('complete');
        setIsProcessing(false);

        if (onAnalysisComplete) {
            onAnalysisComplete(mockAnalysis);
        }

        // Add to activity log
        const activity = {
            id: Date.now().toString(),
            user: user.firstName ? `${user.firstName} ${user.lastName}` : user.email,
            action: 'completed AI analysis',
            timestamp: new Date(),
            details: `Analysis completed for ${tender.title}`
        };
        setRecentActivity([activity, ...recentActivity]);
    };

    return (
        <div className="space-y-6 relative">
            {/* Live Cursors Overlay */}
            {liveCursors.map(cursor => (
                <div
                    key={cursor.userId}
                    className="absolute pointer-events-none z-50"
                >
                    <div className={`bg-${cursor.color}-500 text-white px-2 py-1 rounded text-xs`}>
                        {cursor.userName}
                    </div>
                </div>
            ))}

            {/* Notifications */}
            <div className="fixed top-4 right-4 z-40 space-y-2">
                {notifications.slice(0, 3).map(notification => (
                    <div
                        key={notification.id}
                        className={`p-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-100 text-green-800' :
                                notification.type === 'error' ? 'bg-red-100 text-red-800' :
                                    notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-blue-100 text-blue-800'
                            }`}
                    >
                        <p className="text-sm font-medium">{notification.message}</p>
                        <p className="text-xs opacity-75">{notification.timestamp.toLocaleTimeString()}</p>
                    </div>
                ))}
            </div>

            {/* Enhanced Header with Real-time Collaboration */}
            <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-semibold">🤖 AI Procurement Analysis Chain</h2>

                        {/* Live Collaborators */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Live Collaborators:</span>
                            <div className="flex -space-x-2">
                                {collaborators.filter(c => c.isOnline).slice(0, 4).map((collaborator) => (
                                    <div
                                        key={collaborator.id}
                                        className="relative w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm flex items-center justify-center border-2 border-white"
                                        title={`${collaborator.name} - ${collaborator.role} (Online)`}
                                    >
                                        {collaborator.name.charAt(0).toUpperCase()}
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                                    </div>
                                ))}
                                {collaborators.filter(c => c.isOnline).length > 4 && (
                                    <div className="w-8 h-8 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center border-2 border-white">
                                        +{collaborators.filter(c => c.isOnline).length - 4}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Real-time Status */}
                        <div className="flex items-center gap-2 text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium">Live Session</span>
                        </div>

                        {/* Collaboration Toggle */}
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setActiveTab(activeTab === 'collaboration' ? 'analysis' : 'collaboration')}
                            className="relative"
                        >
                            👥 Collaborate
                            {recentActivity.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {recentActivity.length}
                                </span>
                            )}
                        </Button>

                        {/* Comments Toggle */}
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowComments(!showComments)}
                            className="relative"
                        >
                            💬 Comments
                            {comments.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {comments.length}
                                </span>
                            )}
                        </Button>

                        {isProcessing && (
                            <div className="flex items-center gap-2 text-blue-600">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                Processing...
                            </div>
                        )}
                    </div>
                </div>

                {/* Step Progress with Real-time Updates */}
                <div className="flex items-center gap-4 mb-4">
                    {['Select', 'Analyze', 'Strategy', 'Draft', 'Complete'].map((step, index) => {
                        const steps = ['select', 'analyze', 'strategize', 'write', 'complete'];
                        const isActive = currentStep === steps[index];
                        const isCompleted = steps.indexOf(currentStep) > index;

                        return (
                            <div key={step} className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isCompleted ? 'bg-green-100 text-green-600 scale-110' :
                                        isActive ? 'bg-blue-100 text-blue-600 animate-pulse' :
                                            'bg-gray-100 text-gray-400'
                                    }`}>
                                    {isCompleted ? '✓' : index + 1}
                                </div>
                                <span className={`text-sm font-medium transition-colors ${isCompleted ? 'text-green-600' :
                                        isActive ? 'text-blue-600' :
                                            'text-gray-400'
                                    }`}>
                                    {step}
                                </span>
                                {index < 4 && <div className={`w-8 h-0.5 transition-colors ${isCompleted ? 'bg-green-300' : 'bg-gray-200'
                                    }`} />}
                            </div>
                        );
                    })}
                </div>

                {/* AI Confidence Score with Real-time Updates */}
                {confidenceScore > 0 && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700">AI Analysis Confidence:</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-2xl font-bold ${getConfidenceColor(confidenceScore)}`}>
                                    {confidenceScore}%
                                </span>
                                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${confidenceScore >= 85 ? 'bg-green-500 w-full' :
                                                confidenceScore >= 70 ? 'bg-blue-500 w-4/5' :
                                                    confidenceScore >= 55 ? 'bg-yellow-500 w-3/5' :
                                                        'bg-red-500 w-2/5'
                                            }`}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => addComment('confidence')}
                            >
                                💭 Discuss Score
                            </Button>
                            <div className="relative">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                >
                                    📊 Export
                                </Button>

                                {showExportMenu && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                                        <div className="p-2">
                                            <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">
                                                📄 Export as PDF
                                            </button>
                                            <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">
                                                📊 Export as Excel
                                            </button>
                                            <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">
                                                📋 Export as JSON
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Collaboration Panel */}
            {activeTab === 'collaboration' && (
                <Card className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Team Activity Feed */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                ⚡ Real-time Activity Feed
                            </h3>
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                {recentActivity.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No recent activity</p>
                                ) : (
                                    recentActivity.map((activity) => (
                                        <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center">
                                                {activity.user.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm">
                                                    <span className="font-medium">{activity.user}</span> {activity.action}
                                                </p>
                                                {activity.details && (
                                                    <p className="text-xs text-gray-600 mt-1">{activity.details}</p>
                                                )}
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {activity.timestamp.toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Team Members */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                👥 Team Members
                            </h3>
                            <div className="space-y-3">
                                {collaborators.map((collaborator) => (
                                    <div key={collaborator.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm flex items-center justify-center">
                                                    {collaborator.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${collaborator.isOnline ? 'bg-green-400' : 'bg-gray-400'
                                                    }`}></div>
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{collaborator.name}</p>
                                                <p className="text-xs text-gray-600">{collaborator.role}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xs font-medium ${collaborator.isOnline ? 'text-green-600' : 'text-gray-500'
                                                }`}>
                                                {collaborator.isOnline ? 'Online' : 'Away'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {collaborator.isOnline ? 'Active now' : `Last seen ${collaborator.lastSeen.toLocaleTimeString()}`}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Comments Sidebar */}
            {showComments && (
                <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        💬 Collaborative Comments
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {comments.length} comments
                        </span>
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                        {comments.length === 0 ? (
                            <p className="text-gray-500 text-sm">No comments yet. Start the discussion!</p>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                                                {comment.user.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-sm">{comment.user}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{comment.section}</span>
                                            <span>{comment.timestamp.toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-700">{comment.text}</p>
                                    {comment.replies && comment.replies.length > 0 && (
                                        <div className="mt-2 pl-4 border-l-2 border-blue-200">
                                            <p className="text-xs text-blue-600">{comment.replies.length} replies</p>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onKeyPress={(e) => e.key === 'Enter' && addComment('general')}
                            />
                            <Button size="sm" onClick={() => addComment('general')}>
                                Send
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Use @username to mention team members
                        </p>
                    </div>
                </Card>
            )}

            {/* Enhanced Tender Selection */}
            {!selectedTender && (
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">🎯 Select Tender for AI Analysis</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Enhanced AI Available</span>
                            <span className="text-green-500 animate-pulse">🤖</span>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {tenders.map((tender) => (
                            <div key={tender.id} className="border rounded-lg p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 transform hover:scale-105">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-lg">{tender.title}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm bg-gray-100 px-2 py-1 rounded">{tender.category}</span>
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                                            🎯 AI Match: 92%
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">{tender.description}</p>
                                <div className="flex justify-between items-center">
                                    <div className="text-sm text-gray-500">
                                        <span className="font-medium">Value:</span> £{tender.value?.toLocaleString() || '500,000'}
                                        <span className="ml-4 font-medium">Deadline:</span> {tender.deadline}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => addComment(`tender-${tender.id}`)}
                                        >
                                            💬 Discuss
                                        </Button>
                                        <Button
                                            onClick={() => runMockAnalysis(tender)}
                                            size="sm"
                                            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                                        >
                                            🚀 Analyze with AI
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Enhanced Analysis Results */}
            {selectedTender && analysis && (
                <div className="space-y-4">
                    {/* Tab Navigation */}
                    <div className="flex space-x-4 border-b">
                        <button
                            className={`px-4 py-2 border-b-2 font-medium relative transition-colors ${activeTab === 'analysis'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-800'
                                }`}
                            onClick={() => setActiveTab('analysis')}
                        >
                            🔍 Analysis Report
                            {getSectionComments('analysis').length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                    {getSectionComments('analysis').length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Analysis Results */}
                    {activeTab === 'analysis' && (
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold flex items-center gap-2">
                                    🔍 Enhanced AI Analysis Results
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                                        Match: {analysis.matchScore}%
                                    </span>
                                </h3>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => addComment('analysis')}
                                    >
                                        💬 Comment
                                    </Button>
                                    <Button onClick={() => setSelectedTender(null)} variant="secondary">
                                        ← Back to Tenders
                                    </Button>
                                </div>
                            </div>

                            <div className="grid gap-6">
                                {/* AI Recommendation */}
                                <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-green-700">🎯 AI Recommendation</span>
                                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                            {analysis.recommendation.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-green-700 mt-2">{analysis.analysis}</p>
                                </div>

                                {/* Strengths */}
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <h4 className="flex items-center font-semibold text-green-700 mb-3">
                                        ✅ Our Competitive Strengths
                                    </h4>
                                    <ul className="space-y-2">
                                        {analysis.ourStrengths.map((strength, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <span className="text-green-500 mt-1">💪</span>
                                                <span className="text-sm">{strength}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Gaps */}
                                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                    <h4 className="flex items-center font-semibold text-yellow-700 mb-3">
                                        ⚠️ Areas for Improvement
                                    </h4>
                                    <ul className="space-y-2">
                                        {analysis.potentialGaps.map((gap, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <span className="text-yellow-500 mt-1">🔧</span>
                                                <span className="text-sm">{gap}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Risks */}
                                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                    <h4 className="flex items-center font-semibold text-red-700 mb-3">
                                        🚨 Risk Assessment
                                    </h4>
                                    <ul className="space-y-2">
                                        {analysis.risks.map((risk, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <span className="text-red-500 mt-1">⚡</span>
                                                <span className="text-sm">{risk}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Section Comments */}
                            {getSectionComments('analysis').length > 0 && (
                                <div className="mt-6 pt-6 border-t">
                                    <h5 className="font-semibold mb-3 flex items-center gap-2">
                                        💬 Analysis Discussion
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                            {getSectionComments('analysis').length} comments
                                        </span>
                                    </h5>
                                    <div className="space-y-2">
                                        {getSectionComments('analysis').map((comment) => (
                                            <div key={comment.id} className="bg-blue-50 p-3 rounded-lg">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-medium text-sm">{comment.user}</span>
                                                    <span className="text-xs text-gray-500">{comment.timestamp.toLocaleTimeString()}</span>
                                                </div>
                                                <p className="text-sm">{comment.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    )}
                </div>
            )}

            {/* Simple placeholder for when processing */}
            {isProcessing && selectedTender && (
                <Card className="p-6">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-3 text-blue-600 mb-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="text-lg font-medium">Running AI Analysis...</span>
                        </div>
                        <p className="text-gray-600">
                            Analyzing tender: <strong>{selectedTender.title}</strong>
                        </p>
                        <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-blue-800">
                                🤖 AI is processing requirements, evaluating match score, and generating strategic insights...
                            </p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default ProcurementChain;
