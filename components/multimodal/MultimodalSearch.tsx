import React from 'react';
import { MultimodalSearchQuery, MultimodalSearchResult } from '../../types';

interface MultimodalSearchProps {
  onSearch: (query: MultimodalSearchQuery) => Promise<MultimodalSearchResult[]>;
  onResultSelect: (result: MultimodalSearchResult) => void;
}

export const MultimodalSearch: React.FC<MultimodalSearchProps> = ({ onSearch, onResultSelect }) => {
  return (
    <div className="p-6 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Multimodal Search</h3>
      <p className="text-gray-500">Search across all content types</p>
      <p className="text-sm text-gray-400 mt-2">Advanced search functionality - Coming Soon</p>
    </div>
  );
};
