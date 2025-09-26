import { useState, useEffect, useCallback } from 'react';
import { multiProjectManager, ProjectEnvironment, ProjectConfig } from '../services/multiProjectManager';
import { supabaseManager } from '../services/supabaseClient';

export interface UseMultiProjectReturn {
  currentProject: ProjectEnvironment;
  currentConfig: ProjectConfig;
  availableProjects: Array<{ key: ProjectEnvironment; config: ProjectConfig; configured: boolean }>;
  switchProject: (project: ProjectEnvironment) => void;
  isConfigured: boolean;
  hasMultipleProjects: boolean;
}

export function useMultiProject(): UseMultiProjectReturn {
  const [currentProject, setCurrentProject] = useState<ProjectEnvironment>(
    multiProjectManager.getCurrentProject()
  );

  const currentConfig = multiProjectManager.getCurrentConfig();
  const availableProjects = multiProjectManager.getAvailableProjects();
  const configuredProjects = availableProjects.filter(p => p.configured);

  const switchProject = useCallback((project: ProjectEnvironment) => {
    multiProjectManager.switchProject(project);
    setCurrentProject(project);
  }, []);

  useEffect(() => {
    const handleProjectSwitch = (event: CustomEvent<ProjectEnvironment>) => {
      setCurrentProject(event.detail);
    };

    window.addEventListener('project-switch', handleProjectSwitch as EventListener);
    return () => {
      window.removeEventListener('project-switch', handleProjectSwitch as EventListener);
    };
  }, []);

  return {
    currentProject,
    currentConfig,
    availableProjects,
    switchProject,
    isConfigured: supabaseManager.isConfigured(),
    hasMultipleProjects: configuredProjects.length > 1
  };
}