// Multimodal Input Component
// Unified component for handling multiple input types

import React, { useState, useRef, useCallback } from 'react';
import { MediaType, MultimodalContent } from '../../types/multimodal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface MultimodalInputProps {
  onContentSubmit: (content: Partial<MultimodalContent>) => void;
  onError: (error: string) => void;
  enabledTypes?: MediaType[];
  maxFileSize?: number;
  className?: string;
}

export const MultimodalInput: React.FC<MultimodalInputProps> = ({
  onContentSubmit,
  onError,
  enabledTypes = ['text', 'image', 'audio', 'video', 'document'],
  maxFileSize = 100 * 1024 * 1024, // 100MB
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<MediaType>('text');
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // File upload handler
  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    if (file.size > maxFileSize) {
      onError(`File size exceeds ${Math.round(maxFileSize / 1024 / 1024)}MB limit`);
      return;
    }

    const mediaType = getMediaTypeFromFile(file);
    if (!enabledTypes.includes(mediaType)) {
      onError(`File type ${file.type} is not supported`);
      return;
    }

    // Create content object
    const content: Partial<MultimodalContent> = {
      type: mediaType,
      metadata: {
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        source: 'upload'
      },
      description: `Uploaded ${mediaType}: ${file.name}`,
      tags: [mediaType, 'uploaded']
    };

    // Convert file to base64 for processing
    const reader = new FileReader();
    reader.onload = () => {
      // In a real implementation, you'd upload to storage and store the URL
      onContentSubmit(content);
    };
    reader.onerror = () => onError('Failed to read file');
    reader.readAsDataURL(file);
  }, [maxFileSize, enabledTypes, onContentSubmit, onError]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  // Text input handler
  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return;

    const content: Partial<MultimodalContent> = {
      type: 'text',
      metadata: {
        source: 'manual',
        language: 'en'
      },
      description: textInput.substring(0, 100) + (textInput.length > 100 ? '...' : ''),
      tags: ['text', 'manual']
    };

    onContentSubmit(content);
    setTextInput('');
  }, [textInput, onContentSubmit]);

  // Audio recording handlers
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        const content: Partial<MultimodalContent> = {
          type: 'audio',
          metadata: {
            fileSize: audioBlob.size,
            mimeType: 'audio/wav',
            source: 'microphone',
            duration: 0 // Would be calculated from the recording
          },
          description: 'Audio recording',
          tags: ['audio', 'recorded']
        };

        onContentSubmit(content);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      onError('Failed to access microphone');
    }
  }, [onContentSubmit, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Camera capture handler
  const captureFromCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const content: Partial<MultimodalContent> = {
              type: 'image',
              metadata: {
                fileSize: blob.size,
                mimeType: 'image/png',
                source: 'camera',
                dimensions: {
                  width: canvas.width,
                  height: canvas.height
                }
              },
              description: 'Camera capture',
              tags: ['image', 'camera']
            };

            onContentSubmit(content);
          }
          
          // Clean up
          stream.getTracks().forEach(track => track.stop());
        }, 'image/png');
      };
    } catch (error) {
      onError('Failed to access camera');
    }
  }, [onContentSubmit, onError]);

  // Helper function to determine media type from file
  const getMediaTypeFromFile = (file: File): MediaType => {
    const type = file.type.toLowerCase();
    
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('audio/')) return 'audio';
    if (type.startsWith('video/')) return 'video';
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return 'document';
    
    return 'document'; // Default fallback
  };

  // Tab configuration
  const tabs = [
    { id: 'text' as MediaType, label: 'Text', icon: '📝' },
    { id: 'image' as MediaType, label: 'Image', icon: '🖼️' },
    { id: 'audio' as MediaType, label: 'Audio', icon: '🎵' },
    { id: 'video' as MediaType, label: 'Video', icon: '🎥' },
    { id: 'document' as MediaType, label: 'Document', icon: '📄' }
  ].filter(tab => enabledTypes.includes(tab.id));

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="min-h-[200px]">
          {/* Text Input */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter your text here..."
                className="w-full h-32 p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button 
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className="w-full"
              >
                Submit Text
              </Button>
            </div>
          )}

          {/* File Upload Area */}
          {(activeTab === 'image' || activeTab === 'video' || activeTab === 'document') && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-4">
                <div className="text-4xl">
                  {activeTab === 'image' && '🖼️'}
                  {activeTab === 'video' && '🎥'}
                  {activeTab === 'document' && '📄'}
                </div>
                <div>
                  <p className="text-lg font-medium">
                    Drop your {activeTab} here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Maximum file size: {Math.round(maxFileSize / 1024 / 1024)}MB
                  </p>
                </div>
                <div className="space-x-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                  >
                    Browse Files
                  </Button>
                  {activeTab === 'image' && (
                    <Button
                      onClick={captureFromCamera}
                      variant="outline"
                    >
                      📷 Use Camera
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Audio Recording */}
          {activeTab === 'audio' && (
            <div className="text-center space-y-4">
              <div className="text-6xl">🎵</div>
              <div>
                <p className="text-lg font-medium">Record Audio</p>
                <p className="text-sm text-muted-foreground">
                  Click to start recording from your microphone
                </p>
              </div>
              <div className="space-x-2">
                {!isRecording ? (
                  <Button onClick={startRecording} className="bg-red-500 hover:bg-red-600">
                    🎤 Start Recording
                  </Button>
                ) : (
                  <Button onClick={stopRecording} variant="outline">
                    ⏹️ Stop Recording
                  </Button>
                )}
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  📁 Upload Audio File
                </Button>
              </div>
              {isRecording && (
                <div className="text-red-500 font-medium animate-pulse">
                  🔴 Recording...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
          accept={
            activeTab === 'image' ? 'image/*' :
            activeTab === 'audio' ? 'audio/*' :
            activeTab === 'video' ? 'video/*' :
            activeTab === 'document' ? '.pdf,.doc,.docx,.txt' :
            '*/*'
          }
        />
      </div>
    </Card>
  );
};
