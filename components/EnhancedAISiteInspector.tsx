import React, { useState } from 'react';
import { User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { analyzeConstructionImage, generateSiteInspectionReport } from '../services/multimodalAI';

interface EnhancedAISiteInspectorProps {
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
    onBack: () => void;
}

export const EnhancedAISiteInspector: React.FC<EnhancedAISiteInspectorProps> = ({ user, addToast, onBack }) => {
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [previews, setPreviews] = useState<string[]>([]);
    const [inspectionNotes, setInspectionNotes] = useState('');
    const [analysisType, setAnalysisType] = useState<'single' | 'inspection'>('single');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setImageFiles(files);

        // Generate previews
        const previewPromises = files.map(file => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
        });

        Promise.all(previewPromises).then(setPreviews);
    };

    const handleAnalyze = async () => {
        if (imageFiles.length === 0) {
            addToast('Please select at least one image to analyze.', 'error');
            return;
        }

        setIsLoading(true);
        setAnalysis(null);

        try {
            if (analysisType === 'single') {
                // Single image analysis
                const result = await analyzeConstructionImage(imageFiles[0]);

                let analysisText = `**AI Site Inspection Report**\n\n`;
                analysisText += `**Description:** ${result.description}\n\n`;

                if (result.safetyAssessment) {
                    analysisText += `**Safety Assessment:**\n`;
                    if (result.safetyAssessment.hazards.length > 0) {
                        analysisText += `- **Hazards Identified:** ${result.safetyAssessment.hazards.join(', ')}\n`;
                    }
                    if (result.safetyAssessment.complianceIssues.length > 0) {
                        analysisText += `- **Compliance Issues:** ${result.safetyAssessment.complianceIssues.join(', ')}\n`;
                    }
                    if (result.safetyAssessment.recommendations.length > 0) {
                        analysisText += `- **Recommendations:** ${result.safetyAssessment.recommendations.join(', ')}\n`;
                    }
                    analysisText += `\n`;
                }

                if (result.progressMetrics) {
                    analysisText += `**Progress Assessment:**\n`;
                    analysisText += `- **Completion Estimate:** ${result.progressMetrics.completionEstimate.toFixed(1)}%\n`;
                    analysisText += `- **Work Quality:** ${(result.progressMetrics.workQuality * 100).toFixed(1)}%\n`;
                    if (result.progressMetrics.materialsVisible.length > 0) {
                        analysisText += `- **Materials Visible:** ${result.progressMetrics.materialsVisible.join(', ')}\n`;
                    }
                }

                setAnalysis(analysisText);
            } else {
                // Comprehensive site inspection
                const notes = inspectionNotes.split('\n').filter(note => note.trim());
                const result = await generateSiteInspectionReport({
                    photos: imageFiles,
                    notes,
                    location: 'Construction Site',
                    inspector: `${user.firstName} ${user.lastName}`,
                    projectId: 'current-project'
                });

                let analysisText = `**Comprehensive Site Inspection Report**\n\n`;
                analysisText += `**Inspector:** ${user.firstName} ${user.lastName}\n`;
                analysisText += `**Date:** ${new Date().toLocaleDateString()}\n`;
                analysisText += `**Photos Analyzed:** ${imageFiles.length}\n\n`;

                analysisText += `**Executive Summary:**\n${result.report}\n\n`;

                analysisText += `**Scores:**\n`;
                analysisText += `- **Safety Score:** ${(result.safetyScore * 100).toFixed(1)}%\n`;
                analysisText += `- **Quality Score:** ${(result.qualityScore * 100).toFixed(1)}%\n\n`;

                if (result.recommendations.length > 0) {
                    analysisText += `**Recommendations:**\n`;
                    result.recommendations.forEach((rec, i) => {
                        analysisText += `${i + 1}. ${rec}\n`;
                    });
                    analysisText += `\n`;
                }

                if (result.actionItems.length > 0) {
                    analysisText += `**Action Items:**\n`;
                    result.actionItems.forEach((item, i) => {
                        analysisText += `${i + 1}. **[${item.priority.toUpperCase()}]** ${item.description}\n`;
                    });
                }

                setAnalysis(analysisText);
            }

            addToast('Analysis completed successfully!', 'success');
        } catch (error) {
            console.error('Analysis failed:', error);
            addToast('Analysis failed. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-slate-700">🤖 Enhanced AI Site Inspector</h3>
                    <Button variant="secondary" onClick={onBack}>← Back</Button>
                </div>
                <p className="text-sm text-slate-500 mb-6">
                    Upload construction site photos for AI-powered analysis including safety assessment,
                    progress tracking, and quality evaluation.
                </p>

                {/* Analysis Type Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Type</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setAnalysisType('single')}
                            className={`p-4 border rounded-lg text-left transition-colors ${analysisType === 'single'
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                        >
                            <div className="font-medium">📸 Single Photo Analysis</div>
                            <div className="text-sm text-gray-500">Quick analysis of one image</div>
                        </button>
                        <button
                            onClick={() => setAnalysisType('inspection')}
                            className={`p-4 border rounded-lg text-left transition-colors ${analysisType === 'inspection'
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                        >
                            <div className="font-medium">🔍 Site Inspection</div>
                            <div className="text-sm text-gray-500">Comprehensive multi-photo analysis</div>
                        </button>
                    </div>
                </div>

                {/* File Upload */}
                <div className="mb-6">
                    <label htmlFor="site-photos" className="block text-sm font-medium text-gray-700 mb-2">
                        Site Photos
                    </label>
                    <input
                        type="file"
                        id="site-photos"
                        accept="image/*"
                        multiple={analysisType === 'inspection'}
                        onChange={handleFileChange}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                    {imageFiles.length > 0 && (
                        <p className="text-sm text-gray-500 mt-2">
                            Selected {imageFiles.length} file(s): {imageFiles.map(f => f.name).join(', ')}
                        </p>
                    )}
                </div>

                {/* Image Previews */}
                {previews.length > 0 && (
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {previews.map((preview, index) => (
                                <img
                                    key={index}
                                    src={preview}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Additional Notes for Inspection Mode */}
                {analysisType === 'inspection' && (
                    <div className="mb-6">
                        <label htmlFor="inspection-notes" className="block text-sm font-medium text-gray-700 mb-2">
                            Inspection Notes (Optional)
                        </label>
                        <textarea
                            id="inspection-notes"
                            value={inspectionNotes}
                            onChange={(e) => setInspectionNotes(e.target.value)}
                            rows={4}
                            className="w-full p-3 border border-gray-300 rounded-lg"
                            placeholder="Add specific areas to focus on, questions for AI analysis, or context about the construction phase..."
                        />
                    </div>
                )}

                {/* Analyze Button */}
                <Button
                    onClick={handleAnalyze}
                    disabled={isLoading || imageFiles.length === 0}
                    className="w-full py-3"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Analyzing...
                        </span>
                    ) : (
                        `🚀 ${analysisType === 'single' ? 'Analyze Photo' : 'Generate Inspection Report'}`
                    )}
                </Button>
            </Card>

            {/* Analysis Results */}
            {analysis && (
                <Card>
                    <h4 className="text-lg font-semibold mb-4">📋 Analysis Results</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm font-mono">
                            {analysis}
                        </pre>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-2">
                        <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(analysis)}>
                            📋 Copy Report
                        </Button>
                        <Button variant="secondary" onClick={() => window.print()}>
                            🖨️ Print Report
                        </Button>
                    </div>
                </Card>
            )}

            {/* Getting Started Help */}
            {!analysis && !isLoading && imageFiles.length === 0 && (
                <Card className="bg-blue-50">
                    <h4 className="text-lg font-semibold mb-3 text-blue-800">🎯 How to Use</h4>
                    <div className="space-y-3 text-sm text-blue-700">
                        <div className="flex items-start">
                            <span className="font-medium mr-2">1.</span>
                            <span>Choose your analysis type: Single photo for quick insights or Site inspection for comprehensive reports</span>
                        </div>
                        <div className="flex items-start">
                            <span className="font-medium mr-2">2.</span>
                            <span>Upload clear, well-lit photos of the construction site</span>
                        </div>
                        <div className="flex items-start">
                            <span className="font-medium mr-2">3.</span>
                            <span>Add inspection notes (for comprehensive reports) to focus the AI analysis</span>
                        </div>
                        <div className="flex items-start">
                            <span className="font-medium mr-2">4.</span>
                            <span>Click analyze to get AI-powered insights on safety, progress, and quality</span>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default EnhancedAISiteInspector;