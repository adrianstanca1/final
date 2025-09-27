// Multimodal Content Viewer Component
// Displays multimodal content with AI analysis results

import React, { useState } from 'react';
import { MultimodalContent, ProcessingResults, MediaType } from '../../types/multimodal';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';

interface MultimodalViewerProps {
  content: MultimodalContent;
  onEdit?: (content: MultimodalContent) => void;
  onDelete?: (contentId: string) => void;
  onReprocess?: (contentId: string) => void;
  className?: string;
}

export const MultimodalViewer: React.FC<MultimodalViewerProps> = ({
  content,
  onEdit,
  onDelete,
  onReprocess,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'analysis' | 'metadata'>('content');

  // Format confidence score as percentage
  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status color
  const getStatusColor = (status: string): 'green' | 'blue' | 'red' | 'gray' | 'yellow' => {
    switch (status) {
      case 'completed': return 'green';
      case 'processing': return 'blue';
      case 'failed': return 'red';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  // Render content based on type
  const renderContent = () => {
    switch (content.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Text Content:</p>
              <p className="whitespace-pre-wrap">
                {content.processingResults?.textAnalysis?.extractedText || content.description}
              </p>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div className="relative">
              <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-4xl">🖼️</span>
                <p className="ml-2 text-muted-foreground">Image Preview</p>
              </div>
              {content.metadata.dimensions && (
                <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                  {content.metadata.dimensions.width} × {content.metadata.dimensions.height}
                </div>
              )}
            </div>
            {content.processingResults?.imageAnalysis?.description && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">AI Description:</p>
                <p>{content.processingResults.imageAnalysis.description}</p>
              </div>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-4">
            <div className="p-8 bg-muted rounded-lg text-center">
              <span className="text-4xl">🎵</span>
              <p className="mt-2 text-muted-foreground">Audio File</p>
              {content.metadata.duration && (
                <p className="text-sm">Duration: {formatDuration(content.metadata.duration)}</p>
              )}
            </div>
            {content.processingResults?.audioAnalysis?.transcription && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Transcription:</p>
                <p>{content.processingResults.audioAnalysis.transcription.text}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Confidence: {formatConfidence(content.processingResults.audioAnalysis.transcription.confidence)}
                </p>
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <div className="relative">
              <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-4xl">🎥</span>
                <p className="ml-2 text-muted-foreground">Video Preview</p>
              </div>
              {content.metadata.duration && (
                <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                  {formatDuration(content.metadata.duration)}
                </div>
              )}
            </div>
            {content.processingResults?.videoAnalysis?.scenes && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Scenes Detected:</p>
                <p>{content.processingResults.videoAnalysis.scenes.length} scenes found</p>
              </div>
            )}
          </div>
        );

      case 'document':
        return (
          <div className="space-y-4">
            <div className="p-8 bg-muted rounded-lg text-center">
              <span className="text-4xl">📄</span>
              <p className="mt-2 text-muted-foreground">Document</p>
              <p className="text-sm">{content.metadata.filename}</p>
            </div>
            {content.processingResults?.documentAnalysis && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Document Summary:</p>
                <p>{content.processingResults.documentAnalysis.summary}</p>
                {content.processingResults.documentAnalysis.pageCount && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Pages: {content.processingResults.documentAnalysis.pageCount}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="p-8 bg-muted rounded-lg text-center">
            <span className="text-4xl">❓</span>
            <p className="mt-2 text-muted-foreground">Unknown Content Type</p>
          </div>
        );
    }
  };

  // Render analysis results
  const renderAnalysis = () => {
    const results = content.processingResults;
    if (!results) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No analysis results available</p>
          {onReprocess && (
            <Button onClick={() => onReprocess(content.id)} className="mt-4">
              Run Analysis
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* General Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">AI Provider</p>
            <p className="font-medium">{results.aiProvider}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Model Version</p>
            <p className="font-medium">{results.modelVersion}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Confidence</p>
            <p className="font-medium">{formatConfidence(results.confidence)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Processing Time</p>
            <p className="font-medium">{results.processingTime}ms</p>
          </div>
        </div>

        {/* Text Analysis */}
        {results.textAnalysis && (
          <Card className="p-4">
            <h4 className="font-medium mb-3">Text Analysis</h4>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Sentiment</p>
                <div className="flex items-center gap-2">
                  <Tag 
                    label={results.textAnalysis.sentiment.label}
                    color={
                      results.textAnalysis.sentiment.label === 'positive' ? 'green' :
                      results.textAnalysis.sentiment.label === 'negative' ? 'red' : 'gray'
                    }
                  />
                  <span className="text-sm">
                    Score: {results.textAnalysis.sentiment.score.toFixed(2)}
                  </span>
                </div>
              </div>
              
              {results.textAnalysis.keywords.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {results.textAnalysis.keywords.slice(0, 10).map((keyword, index) => (
                      <Tag key={index} label={keyword.text} color="blue" />
                    ))}
                  </div>
                </div>
              )}

              {results.textAnalysis.entities.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Entities</p>
                  <div className="flex flex-wrap gap-1">
                    {results.textAnalysis.entities.slice(0, 10).map((entity, index) => (
                      <Tag key={index} label={`${entity.text} (${entity.type})`} color="green" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Image Analysis */}
        {results.imageAnalysis && (
          <Card className="p-4">
            <h4 className="font-medium mb-3">Image Analysis</h4>
            <div className="space-y-3">
              {results.imageAnalysis.objects.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Objects Detected</p>
                  <div className="flex flex-wrap gap-1">
                    {results.imageAnalysis.objects.slice(0, 10).map((obj, index) => (
                      <Tag 
                        key={index} 
                        label={`${obj.name} (${formatConfidence(obj.confidence)})`} 
                        color="blue" 
                      />
                    ))}
                  </div>
                </div>
              )}

              {results.imageAnalysis.tags.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {results.imageAnalysis.tags.slice(0, 10).map((tag, index) => (
                      <Tag key={index} label={tag} color="green" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Cross-Modal Analysis */}
        {results.crossModalAnalysis && (
          <Card className="p-4">
            <h4 className="font-medium mb-3">Cross-Modal Analysis</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Coherence</p>
                  <p className="font-medium">{formatConfidence(results.crossModalAnalysis.coherenceScore)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Complementarity</p>
                  <p className="font-medium">{formatConfidence(results.crossModalAnalysis.complementarity)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Redundancy</p>
                  <p className="font-medium">{formatConfidence(results.crossModalAnalysis.redundancy)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Main Theme</p>
                <p>{results.crossModalAnalysis.mainTheme}</p>
              </div>

              {results.crossModalAnalysis.insights.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Insights</p>
                  <ul className="list-disc list-inside space-y-1">
                    {results.crossModalAnalysis.insights.map((insight, index) => (
                      <li key={index} className="text-sm">{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  };

  // Render metadata
  const renderMetadata = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Content ID</p>
          <p className="font-mono text-sm">{content.id}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Type</p>
          <Tag label={content.type} color="blue" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <Tag label={content.status} color={getStatusColor(content.status)} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Created</p>
          <p className="text-sm">{new Date(content.createdAt).toLocaleString()}</p>
        </div>
        {content.metadata.filename && (
          <div>
            <p className="text-sm text-muted-foreground">Filename</p>
            <p className="text-sm">{content.metadata.filename}</p>
          </div>
        )}
        {content.metadata.fileSize && (
          <div>
            <p className="text-sm text-muted-foreground">File Size</p>
            <p className="text-sm">{formatFileSize(content.metadata.fileSize)}</p>
          </div>
        )}
        {content.metadata.mimeType && (
          <div>
            <p className="text-sm text-muted-foreground">MIME Type</p>
            <p className="text-sm">{content.metadata.mimeType}</p>
          </div>
        )}
        {content.metadata.source && (
          <div>
            <p className="text-sm text-muted-foreground">Source</p>
            <p className="text-sm">{content.metadata.source}</p>
          </div>
        )}
      </div>

      {content.tags && content.tags.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Tags</p>
          <div className="flex flex-wrap gap-1">
            {content.tags.map((tag, index) => (
              <Tag key={index} label={tag} color="gray" />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card className={`${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">{content.description || 'Untitled Content'}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Tag label={content.type} color="blue" />
              <Tag label={content.status} color={getStatusColor(content.status)} />
            </div>
          </div>
          <div className="flex gap-2">
            {onReprocess && (
              <Button variant="outline" size="sm" onClick={() => onReprocess(content.id)}>
                🔄 Reprocess
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(content)}>
                ✏️ Edit
              </Button>
            )}
            {onDelete && (
              <Button variant="outline" size="sm" onClick={() => onDelete(content.id)}>
                🗑️ Delete
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b mb-6">
          {[
            { id: 'content', label: 'Content' },
            { id: 'analysis', label: 'Analysis' },
            { id: 'metadata', label: 'Metadata' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'content' && renderContent()}
          {activeTab === 'analysis' && renderAnalysis()}
          {activeTab === 'metadata' && renderMetadata()}
        </div>
      </div>
    </Card>
  );
};
