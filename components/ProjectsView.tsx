// full contents of components/ProjectsView.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, Permission } from '../types';
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

const ProjectCard: React.FC<{ project: Project; onSelect: () => void; }> = ({ project, onSelect }) => {
    const budgetUtilization = (project.actualCost / project.budget) * 100;
    return (
        <Card onClick={onSelect} className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all animate-card-enter">
            <img src={project.imageUrl} alt={project.name} className="w-full h-40 object-cover rounded-lg mb-4" />
            <h3 className="font-bold text-lg truncate">{project.name}</h3>
            <p className="text-sm text-slate-500">{project.location.address}</p>
            <div className="flex justify-between items-center mt-4 text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
// FIX: Changed status strings to uppercase to match type definitions.
                    project.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    project.status === 'COMPLETED' ? 'bg-sky-100 text-sky-800' : 'bg-yellow-100 text-yellow-800'
                }`}>{project.status}</span>
                <span>Budget: £{(project.budget/1000).toFixed(0)}k</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div 
                    className={`${budgetUtilization > 100 ? 'bg-red-500' : 'bg-green-600'}`}
                    style={{ width: `${Math.min(100, budgetUtilization)}%`, height: '100%', borderRadius: 'inherit' }}
                ></div>
            </div>
        </Card>
    );
};

export const ProjectsView: React.FC<ProjectsViewProps> = ({ user, addToast, onSelectProject }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
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
        if (filter === 'All') return projects;
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
            
            <div className="flex gap-2">
                {['All', 'Active', 'Planning', 'Completed', 'On Hold'].map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-sm rounded-full ${filter === f ? 'bg-sky-600 text-white' : 'bg-white hover:bg-slate-100'}`}>{f}</button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProjects.map(project => (
                    <ProjectCard key={project.id} project={project} onSelect={() => onSelectProject(project)} />
                ))}
            </div>
        </div>
    );
};