import React, { useState, useEffect } from 'react';
import { User, Client } from '../types';
import { api } from '../services/api';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface ClientsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

const ClientsView: React.FC<ClientsViewProps> = ({ user, addToast }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        if (!user.companyId) return;
        const data = await api.getClientsByCompany(user.companyId);
        setClients(data);
      } catch (error) {
        console.error('Error fetching clients:', error);
        addToast('Failed to load clients', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [user.companyId, addToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
        <Button>Add Client</Button>
      </div>

      {clients.length === 0 ? (
        <Card className="py-12 text-center">
          <h3 className="text-lg font-medium text-foreground">No clients found</h3>
          <p className="mt-1 text-sm text-muted-foreground">Get started by adding your first client.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="p-6">
              <h3 className="text-lg font-medium text-foreground">{client.name}</h3>
              <p className="text-sm text-muted-foreground">{client.email}</p>
              {client.phone && (
                <p className="text-sm text-muted-foreground">{client.phone}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export { ClientsView };
export default ClientsView;