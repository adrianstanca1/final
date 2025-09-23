import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Todo, User, TodoStatus } from '../types';
import { api } from '../services/mockApi';

export const useTasks = (user: User | null) => {
  return useQuery({
    queryKey: ['tasks', user?.companyId],
    queryFn: () => {
      if (!user?.companyId) throw new Error('Company ID required');
      return api.getTodosByCompany(user.companyId);
    },
    enabled: !!user?.companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (taskData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => 
      api.createTodo(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Todo> }) => 
      api.updateTodo(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (taskId: string) => api.deleteTodo(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TodoStatus }) => 
      api.updateTodo(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};