import React, { useState } from 'react';
import { User, Project } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface AISearchModalProps {
  user: User;
  currentProject: Project | null;
  onClose: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const AISearchModal: React.FC<AISearchModalProps> = ({ user, currentProject, onClose, addToast }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      addToast('Please enter a search query.', 'error');
      return;
    }
    setIsLoading(true);
    setResults(null);
    // Mock AI search
    await new Promise(res => setTimeout(res, 1500));
    setResults(`AI search results for: "${query}"\n\n- Found 3 relevant documents in '${currentProject?.name || 'current project'}'.\n- Found 2 users with expertise in this area.\n- Relevant task: #101 Finalize foundation pouring.`);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center pt-24" onClick={onClose}>
      <Card className="w-full max-w-2xl h-fit max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">AI Search</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g., 'Find all safety reports for Downtown Tower' or 'Who knows about HVAC installation?'"
            className="w-full p-2 border rounded-md"
          />
          <Button onClick={handleSearch} isLoading={isLoading}>Search</Button>
        </div>
        <div className="mt-4 flex-grow overflow-y-auto">
          {isLoading && <p>Searching...</p>}
          {results && (
            <div className="p-4 bg-slate-50 rounded-md whitespace-pre-wrap font-mono text-sm">
              {results}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
