import React, { useState, useEffect } from 'react';
import { User, Client, Project, View } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { api } from '../services/mockApi';

interface ClientsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  setActiveView: (view: View) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ user, addToast, setActiveView }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientsResult, projectsResult] = await Promise.all([
          api.getClients(),
          api.getProjects()
        ]);
        setClients(clientsResult);
        setProjects(projectsResult);
      } catch (error) {
        addToast('Failed to load clients data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [addToast]);

  if (loading) return <Card>Loading clients...</Card>;

  const activeClients = clients.filter(c => c.status === 'active');
  const inactiveClients = clients.filter(c => c.status === 'inactive');

  const getClientProjects = (clientId: string) => {
    return projects.filter(p => p.clientId === clientId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <Button>Add Client</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Total Clients</h3>
            <p className="text-3xl font-bold text-blue-600">{clients.length}</p>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Active</h3>
            <p className="text-3xl font-bold text-green-600">{activeClients.length}</p>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Inactive</h3>
            <p className="text-3xl font-bold text-orange-600">{inactiveClients.length}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Client List</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Company</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Phone</th>
                  <th className="text-left py-2">Projects</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const clientProjects = getClientProjects(client.id);
                  return (
                    <tr key={client.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">{client.name}</td>
                      <td className="py-3">{client.company}</td>
                      <td className="py-3">{client.email}</td>
                      <td className="py-3">{client.phone}</td>
                      <td className="py-3">{clientProjects.length}</td>
                      <td className="py-3">
                        <span 
                          className={`px-2 py-1 rounded text-xs ${
                            client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex space-x-2">
                          <Button variant="secondary" size="sm">View</Button>
                          <Button variant="secondary" size="sm">Edit</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {projects.slice(0, 5).map((project) => {
              const client = clients.find(c => c.id === project.clientId);
              return (
                <div key={project.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{project.name}</h4>
                    <p className="text-sm text-gray-500">
                      Client: {client?.name || 'Unknown'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{project.status}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
};
