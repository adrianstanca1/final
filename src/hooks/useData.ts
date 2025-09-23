import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, SafetyIncident, Expense } from '../types';
import { api } from '../services/mockApi';

export const useTeamMembers = (user: User | null) => {
  return useQuery({
    queryKey: ['team', user?.companyId],
    queryFn: () => {
      if (!user?.companyId) throw new Error('Company ID required');
      return api.getUsersByCompany(user.companyId);
    },
    enabled: !!user?.companyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useSafetyIncidents = (user: User | null) => {
  return useQuery({
    queryKey: ['safetyIncidents', user?.companyId],
    queryFn: () => {
      if (!user?.companyId) throw new Error('Company ID required');
      return api.getSafetyIncidentsByCompany(user.companyId);
    },
    enabled: !!user?.companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateSafetyIncident = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (incidentData: Omit<SafetyIncident, 'id' | 'createdAt' | 'updatedAt'>) => 
      api.createSafetyIncident(incidentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safetyIncidents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useExpenses = (user: User | null) => {
  return useQuery({
    queryKey: ['expenses', user?.companyId],
    queryFn: () => {
      if (!user?.companyId) throw new Error('Company ID required');
      return api.getExpensesByCompany(user.companyId);
    },
    enabled: !!user?.companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => 
      api.createExpense(expenseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};