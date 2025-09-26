/**
 * Voice Command Interface
 * Real-time voice interaction for construction management
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { User } from '../types';
import { processVoiceCommand } from '../services/multimodalAI';

interface VoiceCommandInterfaceProps {
    user: User;
    addToast: (message: string, type: 'success' | 'error' | 'info') => void;
    onBack: () => void;
}

interface VoiceInteraction {
    id: string;
    timestamp: Date;
    command: string;
    response: string;
    actions?: Array<{
        type: string;
        payload: any;
    }>;
}

export const VoiceCommandInterface: React.FC<VoiceCommandInterfaceProps> = ({
    user,
    addToast,
    onBack
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [interactions, setInteractions] = useState<VoiceInteraction[]>([]);
    const [isListening, setIsListening] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recognitionRef = useRef<any>(null);

    // Initialize speech recognition if available
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setIsListening(true);
                addToast('Voice recognition started', 'info');
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onresult = (event) => {
                const current = event.resultIndex;
                const transcript = event.results[current][0].transcript;

                if (event.results[current].isFinal) {
                    processVoiceText(transcript);
                }
            };

            recognition.onerror = (event) => {
                addToast(`Voice recognition error: ${event.error}`, 'error');
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const startVoiceRecognition = () => {
        if (recognitionRef.current && !isListening) {
            recognitionRef.current.start();
        } else {
            addToast('Speech recognition not supported in this browser', 'error');
        }
    };

    const stopVoiceRecognition = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    };

    const processVoiceText = async (text: string) => {
        setIsProcessing(true);

        try {
            // Create a simple text-to-speech audio blob for the AI service
            // In a real implementation, you might want to use the actual audio
            const audioBlob = new Blob([text], { type: 'text/plain' });

            const result = await processVoiceCommand(audioBlob, user.id);

            const interaction: VoiceInteraction = {
                id: Date.now().toString(),
                timestamp: new Date(),
                command: text,
                response: result.text,
                actions: result.actions
            };

            setInteractions(prev => [interaction, ...prev]);

            // Execute any actions returned by the AI
            if (result.actions && result.actions.length > 0) {
                executeActions(result.actions);
            }

            // Text-to-speech response
            speakResponse(result.text);

            addToast('Voice command processed', 'success');
        } catch (error) {
            addToast('Failed to process voice command', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const executeActions = (actions: Array<{ type: string; payload: any }>) => {
        actions.forEach(action => {
            switch (action.type) {
                case 'navigate':
                    // Handle navigation
                    addToast(`Navigating to ${action.payload.view}`, 'info');
                    break;
                case 'create_todo':
                    // Handle todo creation
                    addToast(`Creating todo: ${action.payload.title}`, 'info');
                    break;
                case 'search':
                    // Handle search
                    addToast(`Searching for: ${action.payload.query}`, 'info');
                    break;
                default:
                    console.log('Unknown action:', action);
            }
        });
    };

    const speakResponse = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.8;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            window.speechSynthesis.speak(utterance);
        }
    };

    // Audio recording functions (fallback)
    const startRecording = async () => {
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
                await processRecordedAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            addToast('Recording started...', 'info');
        } catch (error) {
            addToast('Could not access microphone', 'error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const processRecordedAudio = async (audioBlob: Blob) => {
        setIsProcessing(true);

        try {
            const result = await processVoiceCommand(audioBlob, user.id);

            const interaction: VoiceInteraction = {
                id: Date.now().toString(),
                timestamp: new Date(),
                command: 'Audio Command',
                response: result.text,
                actions: result.actions
            };

            setInteractions(prev => [interaction, ...prev]);

            if (result.actions && result.actions.length > 0) {
                executeActions(result.actions);
            }

            speakResponse(result.text);
            addToast('Voice command processed', 'success');
        } catch (error) {
            addToast('Failed to process voice command', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const commonCommands = [
        "Show me today's tasks",
        "Create a new project",
        "What's the weather like on site?",
        "Generate a safety report",
        "Schedule a team meeting",
        "Check project budget",
        "Find available equipment",
        "Update task status to completed"
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">🎙️ Voice Command Interface</h2>
                    <Button variant="secondary" onClick={onBack}>← Back</Button>
                </div>
                <p className="text-muted-foreground">
                    Use voice commands to control your construction management system.
                    Speak naturally and get instant responses with actions.
                </p>
            </Card>

            {/* Voice Controls */}
            <Card>
                <h3 className="font-semibold mb-4">Voice Controls</h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Real-time Recognition */}
                    <div className="space-y-3">
                        <h4 className="font-medium">🎯 Real-time Recognition</h4>
                        {!isListening ? (
                            <Button onClick={startVoiceRecognition} className="w-full bg-green-500 hover:bg-green-600">
                                🎙️ Start Listening
                            </Button>
                        ) : (
                            <Button onClick={stopVoiceRecognition} className="w-full bg-red-500 hover:bg-red-600">
                                ⏹️ Stop Listening
                            </Button>
                        )}
                        {isListening && (
                            <div className="text-center">
                                <div className="animate-pulse text-green-600">● Listening...</div>
                                <p className="text-sm text-muted-foreground">Speak your command now</p>
                            </div>
                        )}
                    </div>

                    {/* Manual Recording */}
                    <div className="space-y-3">
                        <h4 className="font-medium">📹 Manual Recording</h4>
                        {!isRecording ? (
                            <Button onClick={startRecording} className="w-full bg-blue-500 hover:bg-blue-600">
                                🎙️ Record Command
                            </Button>
                        ) : (
                            <Button onClick={stopRecording} className="w-full bg-gray-500 hover:bg-gray-600">
                                ⏹️ Stop Recording
                            </Button>
                        )}
                        {isRecording && (
                            <div className="text-center">
                                <div className="animate-pulse text-red-600">● Recording...</div>
                                <p className="text-sm text-muted-foreground">Click stop when done</p>
                            </div>
                        )}
                    </div>
                </div>

                {isProcessing && (
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-blue-600">Processing your command...</p>
                    </div>
                )}
            </Card>

            {/* Common Commands */}
            <Card>
                <h3 className="font-semibold mb-4">💡 Common Commands</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {commonCommands.map((command, index) => (
                        <button
                            key={index}
                            onClick={() => processVoiceText(command)}
                            disabled={isProcessing}
                            className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                        >
                            "{command}"
                        </button>
                    ))}
                </div>
            </Card>

            {/* Interaction History */}
            {interactions.length > 0 && (
                <Card>
                    <h3 className="font-semibold mb-4">📝 Conversation History</h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {interactions.map((interaction) => (
                            <div key={interaction.id} className="border-l-4 border-blue-500 pl-4 py-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">
                                        {interaction.timestamp.toLocaleTimeString()}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <p className="text-sm font-medium text-blue-800">You said:</p>
                                        <p className="text-sm">{interaction.command}</p>
                                    </div>

                                    <div className="bg-green-50 p-3 rounded-lg">
                                        <p className="text-sm font-medium text-green-800">AI Response:</p>
                                        <p className="text-sm">{interaction.response}</p>
                                    </div>

                                    {interaction.actions && interaction.actions.length > 0 && (
                                        <div className="bg-yellow-50 p-3 rounded-lg">
                                            <p className="text-sm font-medium text-yellow-800">Actions Executed:</p>
                                            <ul className="text-sm list-disc list-inside">
                                                {interaction.actions.map((action, idx) => (
                                                    <li key={idx}>
                                                        {action.type}: {JSON.stringify(action.payload)}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Getting Started */}
            {interactions.length === 0 && !isProcessing && (
                <Card className="bg-blue-50">
                    <h4 className="text-lg font-semibold mb-3 text-blue-800">🚀 Getting Started</h4>
                    <div className="space-y-3 text-sm text-blue-700">
                        <div className="flex items-start">
                            <span className="font-medium mr-2">1.</span>
                            <span>Click "Start Listening" for real-time voice recognition</span>
                        </div>
                        <div className="flex items-start">
                            <span className="font-medium mr-2">2.</span>
                            <span>Speak naturally: "Show me today's tasks" or "Create a new project"</span>
                        </div>
                        <div className="flex items-start">
                            <span className="font-medium mr-2">3.</span>
                            <span>The AI will respond with voice and execute actions automatically</span>
                        </div>
                        <div className="flex items-start">
                            <span className="font-medium mr-2">4.</span>
                            <span>Try the common commands above or ask your own questions</span>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default VoiceCommandInterface;