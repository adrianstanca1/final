import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { User, Project, Task, Equipment, SafetyIncident } from '../types';
import { api } from '../services/mockApi';
import { generateProjectHealthSummary } from '../services/ai';

interface AISearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

interface SearchResult {
    type: 'project' | 'task' | 'equipment' | 'safety' | 'insight';
    id: string;
    title: string;
    description: string;
    relevance: number;
    data?: any;
}

export const AISearchModal: React.FC<AISearchModalProps> = ({ isOpen, onClose, user }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const searchData = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        const controller = new AbortController();
        abortControllerRef.current?.abort();
        abortControllerRef.current = controller;

        setIsSearching(true);
        
        try {
            const [projects, tasks, equipment, incidents] = await Promise.all([
                api.getProjects(),
                api.getTasks(),
                api.getEquipment(),
                api.getSafetyIncidents()
            ]);

            if (controller.signal.aborted) return;

            const searchResults: SearchResult[] = [];
            const lowerQuery = searchQuery.toLowerCase();

            // Search projects
            projects.forEach(project => {
                const relevance = calculateRelevance(lowerQuery, [
                    project.name,
                    project.description,
                    project.location,
                    project.clientName
                ]);
                if (relevance > 0) {
                    searchResults.push({
                        type: 'project',
                        id: project.id,
                        title: project.name,
                        description: `${project.description} - ${project.location}`,
                        relevance,
                        data: project
                    });
                }
            });

            // Search tasks
            tasks.forEach(task => {
                const relevance = calculateRelevance(lowerQuery, [
                    task.title,
                    task.description,
                    task.category
                ]);
                if (relevance > 0) {
                    searchResults.push({
                        type: 'task',
                        id: task.id,
                        title: task.title,
                        description: task.description,
                        relevance,
                        data: task
                    });
                }
            });

            // Search equipment
            equipment.forEach(item => {
                const relevance = calculateRelevance(lowerQuery, [
                    item.name,
                    item.type,
                    item.model || '',
                    item.location || ''
                ]);
                if (relevance > 0) {
                    searchResults.push({
                        type: 'equipment',
                        id: item.id,
                        title: item.name,
                        description: `${item.type} - ${item.model || 'N/A'}`,
                        relevance,
                        data: item
                    });
                }
            });

            // Search safety incidents
            incidents.forEach(incident => {
                const relevance = calculateRelevance(lowerQuery, [
                    incident.title,
                    incident.description,
                    incident.location || ''
                ]);
                if (relevance > 0) {
                    searchResults.push({
                        type: 'safety',
                        id: incident.id,
                        title: incident.title,
                        description: incident.description,
                        relevance,
                        data: incident
                    });
                }
            });

            // Generate AI insights if query seems like a question
            if (lowerQuery.includes('how') || lowerQuery.includes('what') || lowerQuery.includes('why') || lowerQuery.includes('?')) {
                try {
                    const insights = await generateProjectHealthSummary({
                        projectId: projects[0]?.id || 'default',
                        includeTimeline: false,
                        includeRisks: true,
                        includeBudget: false
                    });
                    searchResults.push({
                        type: 'insight',
                        id: 'ai-insight',
                        title: 'AI Insight',
                        description: insights.summary,
                        relevance: 0.8,
                        data: { insights }
                    });
                } catch (error) {
                    // Ignore AI errors
                }
            }

            // Sort by relevance
            searchResults.sort((a, b) => b.relevance - a.relevance);

            setResults(searchResults.slice(0, 20)); // Limit to top 20 results
        } catch (error) {
            if (!controller.signal.aborted) {
                console.error('Search failed:', error);
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsSearching(false);
            }
        }
    }, []);

    const calculateRelevance = (query: string, fields: (string | undefined)[]): number => {
        let relevance = 0;
        const queryWords = query.split(' ').filter(word => word.length > 2);

        fields.forEach(field => {
            if (!field) return;
            const fieldLower = field.toLowerCase();
            
            queryWords.forEach(word => {
                if (fieldLower.includes(word)) {
                    relevance += fieldLower.startsWith(word) ? 1 : 0.5;
                }
            });
        });

        return relevance / Math.max(queryWords.length, 1);
    };

    const handleSearch = useCallback((searchQuery: string) => {
        setQuery(searchQuery);
        searchData(searchQuery);
        
        if (searchQuery.trim() && !recentSearches.includes(searchQuery)) {
            setRecentSearches(prev => [searchQuery, ...prev.slice(0, 4)]);
        }
    }, [searchData, recentSearches]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch(query);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    const renderResultIcon = (type: string) => {
        switch (type) {
            case 'project': return '🏗️';
            case 'task': return '✅';
            case 'equipment': return '🚜';
            case 'safety': return '⚠️';
            case 'insight': return '🤖';
            default: return '📄';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 z-50">
            <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
                <div className="p-4 border-b">
                    <div className="flex items-center space-x-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search projects, tasks, equipment, or ask AI..."
                            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <Button
                            onClick={() => handleSearch(query)}
                            disabled={isSearching}
                            size="sm"
                        >
                            {isSearching ? 'Searching...' : 'Search'}
                        </Button>
                        <Button
                            onClick={onClose}
                            variant="outline"
                            size="sm"
                        >
                            Close
                        </Button>
                    </div>
                    
                    {recentSearches.length > 0 && !query && (
                        <div className="mt-3">
                            <div className="text-sm text-gray-500 mb-2">Recent searches:</div>
                            <div className="flex flex-wrap gap-2">
                                {recentSearches.map((search, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSearch(search)}
                                        className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                                    >
                                        {search}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="overflow-y-auto max-h-96">
                    {results.length > 0 ? (
                        <div className="p-4 space-y-2">
                            {results.map((result, index) => (
                                <div
                                    key={`${result.type}-${result.id}-${index}`}
                                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                    onClick={() => {
                                        // Handle result selection here
                                        console.log('Selected:', result);
                                        onClose();
                                    }}
                                >
                                    <div className="flex items-start space-x-3">
                                        <span className="text-lg">{renderResultIcon(result.type)}</span>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">{result.title}</div>
                                            <div className="text-sm text-gray-600 line-clamp-2">{result.description}</div>
                                            <div className="text-xs text-gray-400 mt-1 capitalize">{result.type}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : query && !isSearching ? (
                        <div className="p-8 text-center text-gray-500">
                            No results found for "{query}"
                        </div>
                    ) : !query ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="text-lg mb-2">🔍</div>
                            <div>Start typing to search across your construction data</div>
                            <div className="text-sm mt-2">Search projects, tasks, equipment, or ask AI questions</div>
                        </div>
                    ) : null}
                </div>
            </Card>
        </div>
    );
};
