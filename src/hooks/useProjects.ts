import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project, User } from '../types';
import { api } from '../services/mockApi';
import { useAuth } from '../contexts/AuthContext';

export const useProjects = (user: User | null) => {
  return useQuery({
    queryKey: ['projects', user?.companyId],
    queryFn: () => {
      if (!user?.companyId) throw new Error('Company ID required');
      return api.getProjectsByCompany(user.companyId);
    },
    enabled: !!user?.companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) =>
      api.createProject(projectData as any, null, user?.id ?? 'system'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Project> }) =>
      api.updateProject(id, updates as any, user?.id ?? 'system'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (projectId: string) => api.updateProject(projectId, { status: 'ARCHIVED' } as any, user?.id ?? 'system'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};