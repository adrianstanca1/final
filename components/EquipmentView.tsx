// full contents of components/EquipmentView.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Equipment, Project, Permission } from '../types';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { EquipmentStatusBadge } from './ui/StatusBadge';

interface EquipmentViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({ user, addToast }) => {
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    const canManage = hasPermission(user, Permission.MANAGE_EQUIPMENT);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;
            const [equipData, projData] = await Promise.all([
                api.getEquipmentByCompany(user.companyId),
                api.getProjectsByCompany(user.companyId),
            ]);
            setEquipment(equipData);
            setProjects(projData);
        } catch (error) {
            addToast("Failed to load equipment data.", "error");
        } finally {
            setLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects]);

    if (loading) return <Card><p>Loading equipment...</p></Card>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">Equipment</h2>
                {canManage && <Button>Add Equipment</Button>}
            </div>
            <Card>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Current Project</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {equipment.map(item => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 font-medium">{item.name}</td>
                                    <td className="px-6 py-4"><EquipmentStatusBadge status={item.status} /></td>
                                    <td className="px-6 py-4">{item.projectId ? projectMap.get(item.projectId) : 'Unassigned'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
