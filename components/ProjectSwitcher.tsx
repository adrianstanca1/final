import React, { useState, useEffect } from 'react';
import { multiProjectManager, ProjectEnvironment } from '../services/multiProjectManager';
import { Button } from './ui/Button';

interface ProjectSwitcherProps {
    className?: string;
}

export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({ className = '' }) => {
    const [currentProject, setCurrentProject] = useState<ProjectEnvironment>(
        multiProjectManager.getCurrentProject()
    );
    const [isOpen, setIsOpen] = useState(false);

    const projects = multiProjectManager.getAvailableProjects();
    const availableProjects = projects.filter(p => p.configured);

    useEffect(() => {
        const handleProjectSwitch = (event: CustomEvent<ProjectEnvironment>) => {
            setCurrentProject(event.detail);
        };

        window.addEventListener('project-switch', handleProjectSwitch as EventListener);
        return () => {
            window.removeEventListener('project-switch', handleProjectSwitch as EventListener);
        };
    }, []);

    const handleProjectChange = (project: ProjectEnvironment) => {
        multiProjectManager.switchProject(project);
        setCurrentProject(project);
        setIsOpen(false);

        // Reload the page to reinitialize services with new project
        window.location.reload();
    };

    // Don't show switcher if only one project is configured
    if (availableProjects.length <= 1) {
        return null;
    }

    const currentConfig = multiProjectManager.getCurrentConfig();

    return (
        <div className={`relative ${className}`}>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2"
            >
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">{currentConfig.name}</span>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </Button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                        <div className="py-1">
                            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Switch Project
                            </div>
                            {availableProjects.map(({ key, config }) => (
                                <button
                                    key={key}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${currentProject === key ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                        }`}
                                    onClick={() => handleProjectChange(key)}
                                >
                                    <div className={`w-2 h-2 rounded-full ${currentProject === key ? 'bg-blue-500' : 'bg-gray-300'
                                        }`} />
                                    <div>
                                        <div className="font-medium">{config.name}</div>
                                        <div className="text-xs text-gray-500">{config.id}</div>
                                    </div>
                                    {currentProject === key && (
                                        <svg className="w-4 h-4 ml-auto text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};