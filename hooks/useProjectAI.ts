import { useState, useCallback } from 'react';
import { Project, Todo, SafetyIncident, Expense } from '../types';
import { generateProjectHealthSummary, ProjectHealthSummaryResult } from '../services/ai';

interface UseProjectAIOptions {
  projects: Project[];
  tasks: Todo[];
  openIncidents: SafetyIncident[];
  expenses: Expense[];
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const useProjectAI = ({ projects, tasks, openIncidents, expenses, addToast }: UseProjectAIOptions) => {
  const [aiSelectedProjectId, setAiSelectedProjectId] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<ProjectHealthSummaryResult | null>(null);
  const [aiSummaryProjectId, setAiSummaryProjectId] = useState<string | null>(null);
  const [isGeneratingAiSummary, setIsGeneratingAiSummary] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateProjectBrief = useCallback(async () => {
    if (!aiSelectedProjectId) {
      setAiError('Select a project to analyse.');
      return;
    }

    const project = projects.find(p => p.id === aiSelectedProjectId);
    if (!project) {
      setAiError('The selected project is no longer available.');
      return;
    }

    setIsGeneratingAiSummary(true);
    setAiError(null);

    try {
      const projectTasks = tasks.filter(task => task.projectId === project.id);
      const projectIncidents = openIncidents.filter(incident => incident.projectId === project.id);
      const projectExpenses = expenses.filter(expense => expense.projectId === project.id);

      const summary = await generateProjectHealthSummary({
        project,
        tasks: projectTasks,
        incidents: projectIncidents,
        expenses: projectExpenses,
      });

      setAiSummary(summary);
      setAiSummaryProjectId(project.id);
    } catch (error) {
      console.error('Failed to generate project health summary', error);
      setAiError('Unable to generate the AI brief right now.');
      addToast('Gemini could not analyse that project at the moment.', 'error');
    } finally {
      setIsGeneratingAiSummary(false);
    }
  }, [aiSelectedProjectId, projects, tasks, openIncidents, expenses, addToast]);

  return {
    aiSelectedProjectId,
    setAiSelectedProjectId,
    aiSummary,
    aiSummaryProjectId,
    isGeneratingAiSummary,
    aiError,
    handleGenerateProjectBrief
  };
};