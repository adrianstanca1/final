/**
 * Multimodal AI Assistant Component
 * Provides various AI-powered analysis capabilities for construction management
 */

import React, { useState, useRef, useCallback } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { User } from '../types';
import {
    analyzeMultimodalContent,
    analyzeConstructionImage,
    processVoiceCommand,
    analyzeConstructionDocument,
    analyzeConstructionVideo,
    generateSiteInspectionReport,
    MultimodalAnalysisResult,
    ImageAnalysisResult,
    DocumentAnalysisResult
} from '../services/multimodalAI';

interface MultimodalAIAssistantProps {
    user: User;
    projectId?: string;
    addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

type AnalysisMode = 'image' | 'video' | 'audio' | 'document' | 'inspection';

interface AnalysisResult {
    type: AnalysisMode;
    result: MultimodalAnalysisResult | ImageAnalysisResult | DocumentAnalysisResult | any;
    timestamp: Date;
    files?: File[];
}

export const MultimodalAIAssistant: React.FC<MultimodalAIAssistantProps> = ({
    user,
    projectId,
    addToast
}) => {
    const [mode, setMode] = useState<AnalysisMode>('image');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState<AnalysisResult[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [notes, setNotes] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // File upload handler
    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        setSelectedFiles(files);
    }, []);

    // Voice recording handlers
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                await analyzeVoiceCommand(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            addToast('Recording started...', 'info');
        } catch (error) {
            addToast('Could not access microphone', 'error');
        }
    }, [addToast]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            addToast('Recording stopped, analyzing...', 'info');
        }
    }, [addToast]);

    // Analysis functions
    const analyzeImages = async () => {
        if (selectedFiles.length === 0) {
            addToast('Please select images to analyze', 'error');
            return;
        }

        setIsAnalyzing(true);
        try {
            const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));

            if (imageFiles.length === 0) {
                addToast('No image files found', 'error');
                return;
            }

            // Analyze each image
            const results = await Promise.all(
                imageFiles.map(file => analyzeConstructionImage(file, projectId, notes))
            );

            const combinedResult: AnalysisResult = {
                type: 'image',
                result: results,
                timestamp: new Date(),
                files: imageFiles
            };

            setResults(prev => [combinedResult, ...prev]);
            addToast(`Successfully analyzed ${imageFiles.length} image(s)`, 'success');
        } catch (error) {
            addToast('Image analysis failed', 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const analyzeVideo = async () => {
        if (selectedFiles.length === 0) {
            addToast('Please select a video file', 'error');
            return;
        }

        const videoFile = selectedFiles.find(file => file.type.startsWith('video/'));
        if (!videoFile) {
            addToast('No video file found', 'error');
            return;
        }

        setIsAnalyzing(true);
        try {
            const result = await analyzeConstructionVideo(videoFile, projectId);

            const analysisResult: AnalysisResult = {
                type: 'video',
                result,
                timestamp: new Date(),
                files: [videoFile]
            };

            setResults(prev => [analysisResult, ...prev]);
            addToast('Video analysis completed', 'success');
        } catch (error) {
            addToast('Video analysis failed', 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const analyzeDocument = async () => {
        if (selectedFiles.length === 0) {
            addToast('Please select a document', 'error');
            return;
        }

        setIsAnalyzing(true);
        try {
            const results = await Promise.all(
                selectedFiles.map(file => analyzeConstructionDocument(file))
            );

            const combinedResult: AnalysisResult = {
                type: 'document',
                result: results,
                timestamp: new Date(),
                files: selectedFiles
            };

            setResults(prev => [combinedResult, ...prev]);
            addToast(`Successfully analyzed ${selectedFiles.length} document(s)`, 'success');
        } catch (error) {
            addToast('Document analysis failed', 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const analyzeVoiceCommand = async (audioBlob: Blob) => {
        setIsAnalyzing(true);
        try {
            const result = await processVoiceCommand(audioBlob, user.id);

            const analysisResult: AnalysisResult = {
                type: 'audio',
                result,
                timestamp: new Date()
            };

            setResults(prev => [analysisResult, ...prev]);
            addToast('Voice command processed', 'success');
        } catch (error) {
            addToast('Voice analysis failed', 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const performSiteInspection = async () => {
        if (selectedFiles.length === 0) {
            addToast('Please select inspection photos', 'error');
            return;
        }

        if (!projectId) {
            addToast('Project ID required for site inspection', 'error');
            return;
        }

        setIsAnalyzing(true);
        try {
            const photos = selectedFiles.filter(file => file.type.startsWith('image/'));
            const notesArray = notes.split('\n').filter(note => note.trim());

            const result = await generateSiteInspectionReport({
                photos,
                notes: notesArray,
                location: 'Site Location', // Could be enhanced with geolocation
                inspector: `${user.firstName} ${user.lastName}`,
                projectId
            });

            const analysisResult: AnalysisResult = {
                type: 'inspection',
                result,
                timestamp: new Date(),
                files: photos
            };

            setResults(prev => [analysisResult, ...prev]);
            addToast('Site inspection report generated', 'success');
        } catch (error) {
            addToast('Site inspection analysis failed', 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAnalyze = () => {
        switch (mode) {
            case 'image':
                analyzeImages();
                break;
            case 'video':
                analyzeVideo();
                break;
            case 'document':
                analyzeDocument();
                break;
            case 'inspection':
                performSiteInspection();
                break;
            default:
                addToast('Please select an analysis mode', 'error');
        }
    };

    const getAcceptedFileTypes = () => {
        switch (mode) {
            case 'image':
            case 'inspection':
                return 'image/*';
            case 'video':
                return 'video/*';
            case 'document':
                return '.pdf,.doc,.docx,.txt';
            default:
                return '*/*';
        }
    };

    const renderResult = (result: AnalysisResult, index: number) => {
        const { type, result: data, timestamp, files } = result;

        return (
            <Card key={index} className="mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold capitalize">{type} Analysis</h4>
                    <span className="text-sm text-muted-foreground">
                        {timestamp.toLocaleString()}
                    </span>
                </div>

                {files && files.length > 0 && (
                    <div className="mb-3">
                        <p className="text-sm text-muted-foreground">
                            Files: {files.map(f => f.name).join(', ')}
                        </p>
                    </div>
                )}

                <div className="space-y-3">
                    {type === 'image' && Array.isArray(data) && (
                        data.map((imageResult: ImageAnalysisResult, idx) => (
                            <div key={idx} className="border-l-4 border-blue-500 pl-4">
                                <p className="text-sm"><strong>Analysis:</strong> {imageResult.description}</p>
                                {imageResult.safetyAssessment && (
                                    <div className="mt-2">
                                        <p className="text-sm font-medium text-red-600">Safety Issues:</p>
                                        <ul className="text-sm list-disc list-inside">
                                            {imageResult.safetyAssessment.hazards.map((hazard, i) => (
                                                <li key={i}>{hazard}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {imageResult.progressMetrics && (
                                    <div className="mt-2">
                                        <p className="text-sm">
                                            <strong>Progress:</strong> {imageResult.progressMetrics.completionEstimate.toFixed(1)}%
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))
                    )}

                    {type === 'video' && (
                        <div className="border-l-4 border-green-500 pl-4">
                            <p className="text-sm"><strong>Summary:</strong> {data.summary}</p>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                <div className="text-center">
                                    <p className="text-sm font-medium">Safety</p>
                                    <p className="text-lg">{(data.overallAssessment.safety * 100).toFixed(0)}%</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium">Progress</p>
                                    <p className="text-lg">{(data.overallAssessment.progress * 100).toFixed(0)}%</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium">Quality</p>
                                    <p className="text-lg">{(data.overallAssessment.quality * 100).toFixed(0)}%</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {type === 'document' && Array.isArray(data) && (
                        data.map((docResult: DocumentAnalysisResult, idx) => (
                            <div key={idx} className="border-l-4 border-purple-500 pl-4">
                                <p className="text-sm"><strong>Type:</strong> {docResult.type}</p>
                                <p className="text-sm"><strong>Summary:</strong> {docResult.summary}</p>
                                {Object.keys(docResult.keyData).length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-sm font-medium">Key Data:</p>
                                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                                            {JSON.stringify(docResult.keyData, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ))
                    )}

                    {type === 'audio' && (
                        <div className="border-l-4 border-yellow-500 pl-4">
                            <p className="text-sm"><strong>Command:</strong> {data.text}</p>
                            {data.actions && data.actions.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-sm font-medium">Actions:</p>
                                    <ul className="text-sm list-disc list-inside">
                                        {data.actions.map((action: any, i: number) => (
                                            <li key={i}>{action.type}: {JSON.stringify(action.payload)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {type === 'inspection' && (
                        <div className="border-l-4 border-red-500 pl-4">
                            <p className="text-sm"><strong>Report:</strong> {data.report}</p>
                            <div className="mt-2 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium">Safety Score</p>
                                    <p className="text-lg">{(data.safetyScore * 100).toFixed(0)}%</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Quality Score</p>
                                    <p className="text-lg">{(data.qualityScore * 100).toFixed(0)}%</p>
                                </div>
                            </div>
                            {data.recommendations && data.recommendations.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-sm font-medium">Recommendations:</p>
                                    <ul className="text-sm list-disc list-inside">
                                        {data.recommendations.map((rec: string, i: number) => (
                                            <li key={i}>{rec}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {data.actionItems && data.actionItems.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-sm font-medium">Action Items:</p>
                                    <ul className="text-sm space-y-1">
                                        {data.actionItems.map((item: any, i: number) => (
                                            <li key={i} className={`p-2 rounded ${item.priority === 'critical' ? 'bg-red-100' :
                                                    item.priority === 'high' ? 'bg-orange-100' :
                                                        item.priority === 'medium' ? 'bg-yellow-100' : 'bg-gray-100'
                                                }`}>
                                                <strong>{item.priority.toUpperCase()}:</strong> {item.description}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <h2 className="text-xl font-bold mb-4">🤖 Multimodal AI Assistant</h2>
                <p className="text-muted-foreground">
                    Upload images, videos, documents, or use voice commands for AI-powered construction analysis
                </p>
            </Card>

            {/* Mode Selection */}
            <Card>
                <h3 className="font-semibold mb-3">Analysis Mode</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {[
                        { key: 'image', label: '📷 Images', desc: 'Analyze photos' },
                        { key: 'video', label: '🎥 Video', desc: 'Video analysis' },
                        { key: 'audio', label: '🎙️ Voice', desc: 'Voice commands' },
                        { key: 'document', label: '📄 Documents', desc: 'Process docs' },
                        { key: 'inspection', label: '🔍 Inspection', desc: 'Site reports' }
                    ].map(mode_option => (
                        <button
                            key={mode_option.key}
                            onClick={() => setMode(mode_option.key as AnalysisMode)}
                            className={`p-3 rounded text-center transition-colors ${mode === mode_option.key
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                        >
                            <div className="text-sm font-medium">{mode_option.label}</div>
                            <div className="text-xs opacity-70">{mode_option.desc}</div>
                        </button>
                    ))}
                </div>
            </Card>

            {/* Input Section */}
            <Card>
                <h3 className="font-semibold mb-3">Input</h3>

                {mode !== 'audio' && (
                    <div className="space-y-3">
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple={mode !== 'video'}
                                accept={getAcceptedFileTypes()}
                                onChange={handleFileUpload}
                                className="w-full p-2 border rounded"
                            />
                            {selectedFiles.length > 0 && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    Selected: {selectedFiles.map(f => f.name).join(', ')}
                                </p>
                            )}
                        </div>

                        {(mode === 'inspection' || mode === 'image') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Additional Notes (optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="w-full p-2 border rounded"
                                    placeholder="Add context or specific questions for analysis..."
                                />
                            </div>
                        )}
                    </div>
                )}

                {mode === 'audio' && (
                    <div className="text-center space-y-3">
                        {!isRecording ? (
                            <Button onClick={startRecording} className="bg-red-500 hover:bg-red-600">
                                🎙️ Start Recording
                            </Button>
                        ) : (
                            <Button onClick={stopRecording} className="bg-gray-500 hover:bg-gray-600">
                                ⏹️ Stop Recording
                            </Button>
                        )}
                        {isRecording && (
                            <p className="text-sm text-red-600">Recording... Click stop when done</p>
                        )}
                    </div>
                )}

                {mode !== 'audio' && (
                    <div className="mt-4">
                        <Button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || (selectedFiles.length === 0)}
                            className="w-full"
                        >
                            {isAnalyzing ? 'Analyzing...' : `🚀 Analyze ${mode.charAt(0).toUpperCase() + mode.slice(1)}`}
                        </Button>
                    </div>
                )}
            </Card>

            {/* Results */}
            {results.length > 0 && (
                <div>
                    <h3 className="font-semibold mb-4">Analysis Results</h3>
                    <div className="space-y-4">
                        {results.map((result, index) => renderResult(result, index))}
                    </div>
                </div>
            )}

            {results.length === 0 && !isAnalyzing && (
                <Card className="text-center py-8">
                    <p className="text-muted-foreground">
                        No analysis results yet. Upload files or record voice commands to get started.
                    </p>
                </Card>
            )}
        </div>
    );
};

export default MultimodalAIAssistant;