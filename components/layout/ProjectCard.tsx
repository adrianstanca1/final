import React from 'react';
import { Project } from '../../types';
import { formatDate } from '../../utils/formatters';
import { formatCurrency } from '../../utils/finance';
import './projectCard.css';

interface ProjectCardProps {
    project: Project;
    onClick: () => void;
    isSelected?: boolean;
}

const getStatusBadgeColor = (status: string): string => {
    switch (status) {
        case 'PLANNING':
            return 'bg-blue-100 text-blue-800';
        case 'ACTIVE':
            return 'bg-yellow-100 text-yellow-800';
        case 'ON_HOLD':
            return 'bg-orange-100 text-orange-800';
        case 'COMPLETED':
            return 'bg-green-100 text-green-800';
        case 'CANCELLED':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, isSelected }) => {
    // Use project progress directly instead of calculating from tasks
    const progress = project.progress || 0;

    return (
        <button
            className={`w-full text-left border rounded-lg p-4 transition-all hover:shadow-md ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
            onClick={onClick}
            aria-pressed={isSelected ? 'true' : 'false'}
        >
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-medium text-lg">{project.name}</h3>
                    <p className="text-gray-600 text-sm">{project.location?.address || 'No location'}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${getStatusBadgeColor(project.status)}`}>
                    {project.status}
                </span>
            </div>

            <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="project-progress-bar"
                        style={{ "--progress-width": `${progress}%` } as React.CSSProperties}
                    ></div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div>
                    <span className="text-gray-500">Start Date</span>
                    <p>{formatDate(project.startDate)}</p>
                </div>
                <div>
                    <span className="text-gray-500">End Date</span>
                    <p>{project.endDate ? formatDate(project.endDate) : 'Not set'}</p>
                </div>
                <div>
                    <span className="text-gray-500">Budget</span>
                    <p>{formatCurrency(project.budget)}</p>
                </div>
                <div>
                    <span className="text-gray-500">Spent</span>
                    <p>{formatCurrency(project.spent)}</p>
                </div>
            </div>
        </button>
    );
};