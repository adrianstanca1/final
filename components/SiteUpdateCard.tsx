import React from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { User } from '../types';

interface SiteUpdate {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  author: string;
  type: 'progress' | 'issue' | 'completion' | 'safety';
  projectId?: string;
}

interface SiteUpdateCardProps {
  update: SiteUpdate;
  user: User;
  onView?: (update: SiteUpdate) => void;
}

export const SiteUpdateCard: React.FC<SiteUpdateCardProps> = ({ 
  update, 
  user, 
  onView 
}) => {
  const getTypeColor = (type: SiteUpdate['type']) => {
    switch (type) {
      case 'progress':
        return 'bg-blue-100 text-blue-800';
      case 'issue':
        return 'bg-red-100 text-red-800';
      case 'completion':
        return 'bg-green-100 text-green-800';
      case 'safety':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: SiteUpdate['type']) => {
    switch (type) {
      case 'progress':
        return '🔄';
      case 'issue':
        return '⚠️';
      case 'completion':
        return '✅';
      case 'safety':
        return '🚨';
      default:
        return '📋';
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getTypeIcon(update.type)}</span>
            <Card.Title className="text-lg">{update.title}</Card.Title>
            <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(update.type)}`}>
              {update.type}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            {update.timestamp.toLocaleDateString()} {update.timestamp.toLocaleTimeString()}
          </span>
        </div>
      </Card.Header>
      <Card.Content>
        <p className="text-gray-700 mb-3">{update.description}</p>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">By: {update.author}</span>
          {onView && (
            <Button variant="outline" size="sm" onClick={() => onView(update)}>
              View Details
            </Button>
          )}
        </div>
      </Card.Content>
    </Card>
  );
};

export default SiteUpdateCard;
