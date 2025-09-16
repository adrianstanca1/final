// full contents of components/ProjectsView.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, Permission, ProjectStatus } from '../types';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ProjectModal } from './CreateProjectModal';

interface ProjectsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  onSelectProject: (project: Project) => void;
}

const STATUS_BADGE_STYLES: Record<ProjectStatus, string> = {
    PLANNING: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200',
    ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
    ON_HOLD: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200',
    COMPLETED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200',
    CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200',
};

const STATUS_FILTERS = [
    { label: 'All projects', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Planning', value: 'PLANNING' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'On hold', value: 'ON_HOLD' },
    { label: 'Cancelled', value: 'CANCELLED' },
] as const;

type StatusFilterValue = typeof STATUS_FILTERS[number]['value'];

const formatStatusLabel = (status: ProjectStatus) =>
    status
        .toLowerCase()
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

const ProjectCard: React.FC<{ project: Project; onSelect: () => void; }> = ({ project, onSelect }) => {
    const actualCost = typeof project.actualCost === 'number' ? project.actualCost : project.spent ?? 0;
    const budget = typeof project.budget === 'number' ? project.budget : 0;
    const utilisationRaw = budget > 0 ? (actualCost / budget) * 100 : 0;
    const utilisation = Number.isFinite(utilisationRaw) ? Math.max(0, utilisationRaw) : 0;
    const utilisationClass = utilisation > 100 ? 'bg-red-500' : 'bg-emerald-600';
    const heroImage = project.imageUrl || project.image || `https://picsum.photos/seed/${project.id}/800/400`;
    const budgetDisplay = budget > 0 ? Math.round(budget / 1000).toLocaleString() : '0';

    return (
        <Card
            onClick={onSelect}
            className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all animate-card-enter"
        >
            <img src={heroImage} alt={project.name} className="w-full h-40 object-cover rounded-lg mb-4" />
            <h3 className="font-bold text-lg truncate text-foreground">{project.name}</h3>
            <p className="text-sm text-muted-foreground">{project.location?.address ?? 'Location pending'}</p>
            <div className="flex justify-between items-center mt-4 text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE_STYLES[project.status]}`}>
                    {formatStatusLabel(project.status)}
                </span>
                <span className="text-muted-foreground">Budget: £{budgetDisplay}k</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-3">
                <div
                    className={`${utilisationClass}`}
                    style={{ width: `${Math.min(100, Math.round(utilisation))}%`, height: '100%', borderRadius: 'inherit' }}
                    aria-hidden
                ></div>
            </div>
        </Card>
    );
};

export const ProjectsView: React.FC<ProjectsViewProps> = ({ user, addToast, onSelectProject }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<StatusFilterValue>('ALL');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const canCreate = hasPermission(user, Permission.CREATE_PROJECT);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;
            let projectsPromise: Promise<Project[]>;
            if (hasPermission(user, Permission.VIEW_ALL_PROJECTS)) {
                projectsPromise = api.getProjectsByCompany(user.companyId);
            } else {
                projectsPromise = api.getProjectsByUser(user.id);
            }
            const fetchedProjects = await projectsPromise;
            setProjects(fetchedProjects);
        } catch (error) {
            addToast("Failed to load projects.", "error");
        } finally {
            setLoading(false);
        }
    }, [user, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const filteredProjects = useMemo(() => {
        if (filter === 'ALL') return projects;
        return projects.filter(p => p.status === filter);
    }, [projects, filter]);

    const handleSuccess = (newProject: Project) => {
        setProjects(prev => [...prev, newProject]);
        onSelectProject(newProject);
    };

    if (loading) return <Card><p>Loading projects...</p></Card>;

    return (
        <div className="space-y-6">
            {isCreateModalOpen && (
                <ProjectModal 
                    user={user} 
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={handleSuccess}
                    addToast={addToast}
                />
            )}
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">Projects</h2>
                {canCreate && <Button onClick={() => setIsCreateModalOpen(true)}>Create Project</Button>}
            </div>
            
            <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map(option => (
                    <button
                        key={option.value}
                        onClick={() => setFilter(option.value)}
                        className={`px-3 py-1 text-sm rounded-full border transition ${
                            filter === option.value
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-card hover:bg-muted border-border text-muted-foreground'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProjects.length === 0 && (
                    <Card className="col-span-full text-center py-16">
                        <p className="text-muted-foreground">No projects match this filter yet.</p>
                    </Card>
                )}
                {filteredProjects.map(project => (
                    <ProjectCard key={project.id} project={project} onSelect={() => onSelectProject(project)} />
                ))}
            </div>
        </div>
    );
};