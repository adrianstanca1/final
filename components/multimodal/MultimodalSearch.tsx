// Multimodal Search Component
// Advanced search across all media types with filters and similarity matching

import React, { useState, useCallback } from 'react';
import { 
  MultimodalSearchQuery, 
  MultimodalSearchResult, 
  MediaType 
} from '../../types/multimodal';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';

interface MultimodalSearchProps {
  onSearch: (query: MultimodalSearchQuery) => Promise<MultimodalSearchResult[]>;
  onResultSelect: (result: MultimodalSearchResult) => void;
  className?: string;
}

export const MultimodalSearch: React.FC<MultimodalSearchProps> = ({
  onSearch,
  onResultSelect,
  className = ''
}) => {
  const [query, setQuery] = useState<MultimodalSearchQuery>({
    text: '',
    filters: {
      mediaTypes: [],
      minConfidence: 0.5
    },
    similarity: {
      threshold: 0.7,
      method: 'combined'
    },
    limit: 20
  });
  
  const [results, setResults] = useState<MultimodalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle search execution
  const handleSearch = useCallback(async () => {
    if (!query.text?.trim() && !query.imageUrl && !query.audioUrl && !query.videoUrl) {
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await onSearch(query);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, onSearch]);

  // Update query filters
  const updateFilters = useCallback((updates: Partial<MultimodalSearchQuery['filters']>) => {
    setQuery(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        ...updates
      }
    }));
  }, []);

  // Toggle media type filter
  const toggleMediaType = useCallback((mediaType: MediaType) => {
    const currentTypes = query.filters.mediaTypes || [];
    const newTypes = currentTypes.includes(mediaType)
      ? currentTypes.filter(t => t !== mediaType)
      : [...currentTypes, mediaType];
    
    updateFilters({ mediaTypes: newTypes });
  }, [query.filters.mediaTypes, updateFilters]);

  // Format relevance score
  const formatRelevance = (score: number): string => {
    return `${Math.round(score * 100)}%`;
  };

  // Get media type icon
  const getMediaTypeIcon = (type: MediaType): string => {
    switch (type) {
      case 'text': return '📝';
      case 'image': return '🖼️';
      case 'audio': return '🎵';
      case 'video': return '🎥';
      case 'document': return '📄';
      case 'mixed': return '🔀';
      default: return '❓';
    }
  };

  // Media type options
  const mediaTypes: MediaType[] = ['text', 'image', 'audio', 'video', 'document', 'mixed'];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Input */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Main search bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={query.text || ''}
              onChange={(e) => setQuery(prev => ({ ...prev, text: e.target.value }))}
              placeholder="Search across all content types..."
              className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button 
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6"
            >
              {isSearching ? '🔍 Searching...' : '🔍 Search'}
            </Button>
          </div>

          {/* Quick filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Filter by type:</span>
            {mediaTypes.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => toggleMediaType(type)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  query.filters.mediaTypes?.includes(type)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
              >
                <span className="mr-1">{getMediaTypeIcon(type)}</span>
                {type}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              ⚙️ Advanced
            </Button>
          </div>

          {/* Advanced filters */}
          {showAdvanced && (
            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Confidence threshold */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Min Confidence: {Math.round((query.filters.minConfidence || 0.5) * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={query.filters.minConfidence || 0.5}
                    onChange={(e) => updateFilters({ minConfidence: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Similarity threshold */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Similarity: {Math.round((query.similarity?.threshold || 0.7) * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={query.similarity?.threshold || 0.7}
                    onChange={(e) => setQuery(prev => ({
                      ...prev,
                      similarity: {
                        ...prev.similarity!,
                        threshold: parseFloat(e.target.value)
                      }
                    }))}
                    className="w-full"
                  />
                </div>

                {/* Result limit */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Results: {query.limit || 20}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={query.limit || 20}
                    onChange={(e) => setQuery(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">From Date</label>
                  <input
                    type="date"
                    value={query.filters.dateRange?.start || ''}
                    onChange={(e) => updateFilters({
                      dateRange: {
                        ...query.filters.dateRange,
                        start: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">To Date</label>
                  <input
                    type="date"
                    value={query.filters.dateRange?.end || ''}
                    onChange={(e) => updateFilters({
                      dateRange: {
                        ...query.filters.dateRange,
                        end: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Tags filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={query.filters.tags?.join(', ') || ''}
                  onChange={(e) => updateFilters({
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  })}
                  placeholder="construction, safety, equipment..."
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Search Results */}
      {results.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Search Results ({results.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResults([])}
              >
                Clear Results
              </Button>
            </div>

            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={`${result.content.id}-${index}`}
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onResultSelect(result)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">
                          {getMediaTypeIcon(result.content.type)}
                        </span>
                        <h4 className="font-medium">
                          {result.content.description || 'Untitled Content'}
                        </h4>
                        <Tag 
                          label={result.content.type} 
                          color="blue" 
                        />
                        <Tag 
                          label={`${formatRelevance(result.relevanceScore)} match`}
                          color="green"
                        />
                      </div>

                      {result.snippet && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {result.snippet}
                        </p>
                      )}

                      {result.matchedFields.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs text-muted-foreground">Matched:</span>
                          {result.matchedFields.map((field, fieldIndex) => (
                            <Tag 
                              key={fieldIndex}
                              label={field}
                              color="gray"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-right text-sm text-muted-foreground">
                      <p>{new Date(result.content.createdAt).toLocaleDateString()}</p>
                      {result.content.metadata.fileSize && (
                        <p>{Math.round(result.content.metadata.fileSize / 1024)} KB</p>
                      )}
                    </div>
                  </div>

                  {result.highlights && result.highlights.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Highlights:</p>
                      <div className="space-y-1">
                        {result.highlights.slice(0, 3).map((highlight, highlightIndex) => (
                          <p key={highlightIndex} className="text-xs">
                            <span className="font-medium">{highlight.field}:</span>{' '}
                            <span 
                              dangerouslySetInnerHTML={{
                                __html: highlight.text.replace(
                                  new RegExp(`(.{0,20})(${query.text})(.{0,20})`, 'gi'),
                                  '$1<mark>$2</mark>$3'
                                )
                              }}
                            />
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* No results message */}
      {!isSearching && results.length === 0 && query.text && (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium mb-2">No results found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or filters
          </p>
        </Card>
      )}

      {/* Loading state */}
      {isSearching && (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-4 animate-spin">🔍</div>
          <h3 className="text-lg font-medium mb-2">Searching...</h3>
          <p className="text-muted-foreground">
            Analyzing content across all media types
          </p>
        </Card>
      )}
    </div>
  );
};
