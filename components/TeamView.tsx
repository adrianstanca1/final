// full contents of components/TeamView.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { User, Role, Permission } from '../types';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { Tag } from './ui/Tag';

interface TeamViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  onStartChat: (recipient: User) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({ user, addToast, onStartChat }) => {
    const [team, setTeam] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;
            const users = await api.getUsersByCompany(user.companyId);
            setTeam(users);
        } catch (error) {
            addToast("Failed to load team members.", "error");
        } finally {
            setLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const canManageTeam = hasPermission(user, Permission.MANAGE_TEAM);

    if (loading) return <Card><p>Loading team members...</p></Card>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">Team Members</h2>
                {canManageTeam && <Button>Add Member</Button>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {team.filter(member => member.role !== Role.PRINCIPAL_ADMIN).map(member => (
                    <Card key={member.id} className="text-center animate-card-enter">
                        <Avatar name={member.name} imageUrl={member.avatarUrl} className="w-24 h-24 mx-auto mb-4" />
                        <h3 className="font-bold text-lg">{member.name}</h3>
                        <p className="text-sm text-slate-500">{member.email}</p>
                        <div className="mt-4">
                            <Tag label={member.role} color={member.role === Role.ADMIN ? 'red' : member.role === Role.PM ? 'blue' : 'gray'} />
                        </div>
                         {user.id !== member.id && hasPermission(user, Permission.SEND_DIRECT_MESSAGE) && (
                            <Button variant="secondary" size="sm" className="mt-4" onClick={() => onStartChat(member)}>
                                Message
                            </Button>
                         )}
                    </Card>
                ))}
            </div>
        </div>
    );
};
