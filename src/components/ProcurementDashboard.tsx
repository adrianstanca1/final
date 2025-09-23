import React, { useState } from 'react';
import { ProcurementChain } from './ProcurementChain';
import AIAnalyticsDashboard from './analytics/AIAnalyticsDashboard';
import { getSampleTenders } from '../data/sampleTenders';
import { AnalysisReport } from '../types/procurement';
import { User, Role } from '../types';
import { Button } from './ui/Button';

interface ProcurementDashboardProps {
    user: User;
}

export const ProcurementDashboard: React.FC<ProcurementDashboardProps> = ({ user }) => {
    const [activeView, setActiveView] = useState<'analysis' | 'analytics'>('analysis');

    // Restrict access to Platform Admins and Company Owners only
    if (user.role !== Role.PRINCIPAL_ADMIN && user.role !== Role.OWNER) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <h2 className="text-2xl font-bold text-red-800 mb-2">Access Restricted</h2>
                    <p className="text-red-600 mb-4">
                        AI Procurement Analysis is available only to Platform Administrators and Company Owners.
                    </p>
                    <p className="text-sm text-red-500">
                        Contact your system administrator for access.
                    </p>
                </div>
            </div>
        );
    }

    const handleAnalysisComplete = (analysis: AnalysisReport) => {
        console.log('Analysis completed:', analysis);
    };

    // Determine database context based on user role
    const databaseContext = user.role === Role.PRINCIPAL_ADMIN ? 'platform' : 'company';
    const databaseLabel = user.role === Role.PRINCIPAL_ADMIN ? 'Platform Database' : `${user.companyId} Company Database`;

    // Sample analysis data for analytics dashboard
    const sampleAnalyses: AnalysisReport[] = [
        {
            tenderId: '1',
            matchScore: 88,
            keyRequirements: ['Commercial experience', 'Local presence'],
            ourStrengths: ['Award-winning portfolio', 'Local workforce'],
            potentialGaps: ['Limited healthcare experience'],
            risks: ['Timeline constraints', 'Material costs'],
            recommendation: 'highly_recommended',
            analysis: 'Strong match with excellent positioning',
            generatedAt: new Date().toISOString()
        }
    ];

    return (
        <div className="p-6">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold text-gray-900">
                            🤖 AI Procurement Analysis
                        </h1>

                        {/* View Toggle */}
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            <Button
                                variant={activeView === 'analysis' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setActiveView('analysis')}
                                className="px-4 py-2"
                            >
                                🔍 Analysis Chain
                            </Button>
                            <Button
                                variant={activeView === 'analytics' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setActiveView('analytics')}
                                className="px-4 py-2"
                            >
                                📊 Analytics Dashboard
                            </Button>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-sm font-medium text-gray-700">
                            {user.role === Role.PRINCIPAL_ADMIN ? '👑 Platform Admin' : '👤 Company Owner'}
                        </div>
                        <div className="text-xs text-gray-500">
                            Database: {databaseLabel}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-600">
                            {activeView === 'analysis'
                                ? 'Analyze tender opportunities with AI-powered insights and generate winning proposals'
                                : 'Advanced analytics dashboard with predictive models and market intelligence'
                            }
                        </p>
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>🔒 Restricted Access:</strong> This feature is available only to Platform Administrators and Company Owners.
                                {user.role === Role.PRINCIPAL_ADMIN
                                    ? ' You have access to all companies\'s procurement data.'
                                    : ' You have access to your company\'s procurement data only.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conditional Content Based on Active View */}
            {activeView === 'analysis' ? (
                <ProcurementChain
                    tenders={getSampleTenders()}
                    onAnalysisComplete={handleAnalysisComplete}
                    user={user}
                    databaseContext={databaseContext}
                />
            ) : (
                <AIAnalyticsDashboard
                    user={user}
                    tenders={getSampleTenders()}
                    analyses={sampleAnalyses}
                />
            )}
        </div>
    );
};