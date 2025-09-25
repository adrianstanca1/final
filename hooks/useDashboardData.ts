import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Project, Todo, Equipment, AuditLog, SafetyIncident, Expense, OperationalInsights, Role } from '../types';
import { api } from '../services/mockApi';

interface DashboardData {
  projects: Project[];
  team: User[];
  equipment: Equipment[];
  tasks: Todo[];
  activityLog: AuditLog[];
  incidents: SafetyIncident[];
  expenses: Expense[];
  operationalInsights: OperationalInsights | null;
}

interface UseDashboardDataOptions {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const useDashboardData = ({ user, addToast }: UseDashboardDataOptions) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    projects: [],
    team: [],
    equipment: [],
    tasks: [],
    activityLog: [],
    incidents: [],
    expenses: [],
    operationalInsights: null,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      if (!user.companyId) return;
      
      const [projData, usersData, equipData, assignmentsData, logsData, insightsData] = await Promise.all([
        api.getProjectsByManager(user.id, { signal: controller.signal }),
        api.getUsersByCompany(user.companyId, { signal: controller.signal }),
        api.getEquipmentByCompany(user.companyId, { signal: controller.signal }),
        api.getResourceAssignments(user.companyId, { signal: controller.signal }),
        api.getAuditLogsByCompany(user.companyId, { signal: controller.signal }),
        api.getOperationalInsights(user.companyId, { signal: controller.signal }),
      ]);

      if (controller.signal.aborted) return;

      const filteredTeam = usersData.filter(u => u.role !== Role.PRINCIPAL_ADMIN);
      const activeProjectIds = new Set(projData.filter(p => p.status === 'ACTIVE').map(p => p.id));
      const tasksData = await api.getTodosByProjectIds(Array.from(activeProjectIds) as string[], { signal: controller.signal });
      
      if (controller.signal.aborted) return;

      const assignedEquipmentIds = new Set(assignmentsData
        .filter(a => a.resourceType === 'equipment' && activeProjectIds.has(a.projectId))
        .map(a => a.resourceId));
      const filteredEquipment = equipData.filter(e => assignedEquipmentIds.has(e.id));

      const filteredActivityLog = logsData
        .filter(l => l.action.includes('task'))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const [incidentsData, expensesData] = await Promise.all([
        api.getSafetyIncidentsByCompany(user.companyId, { signal: controller.signal }),
        api.getExpensesByCompany(user.companyId, { signal: controller.signal }),
      ]);

      if (controller.signal.aborted) return;

      setData({
        projects: projData,
        team: filteredTeam,
        equipment: filteredEquipment,
        tasks: tasksData,
        activityLog: filteredActivityLog,
        incidents: incidentsData,
        expenses: expensesData,
        operationalInsights: insightsData,
      });

    } catch (error) {
      if (controller.signal.aborted) return;
      console.error('Dashboard data load failed:', error);
      addToast("Failed to load dashboard data.", 'error');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [user, addToast]);

  useEffect(() => {
    fetchData();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchData]);

  return { ...data, loading, refetch: fetchData };
};