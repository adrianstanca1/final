import React from 'react';
import { MultimodalContent } from '../../types';

interface MultimodalViewerProps {
  content: MultimodalContent;
  onReprocess: (contentId: string) => void;
  onDelete: (contentId: string) => void;
}

export const MultimodalViewer: React.FC<MultimodalViewerProps> = ({ content, onReprocess, onDelete }) => {
  return (
    <div className="p-6 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Content Viewer</h3>
      <p className="text-gray-500">Viewing content: {content.id}</p>
      <p className="text-sm text-gray-400 mt-2">Multimodal content viewer - Coming Soon</p>
    </div>
  );
};
