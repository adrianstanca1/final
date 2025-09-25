import React, { useState, useEffect } from 'react';
import { User, SafetyIncident, Project, View, IncidentStatus } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { api } from '../services/mockApi';

interface SafetyViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  setActiveView: (view: View) => void;
}; // FIX: Close the interface

export const SafetyView: React.FC<SafetyViewProps> = ({ user, addToast, setActiveView }) => {
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [incidentsResult, projectsResult] = await Promise.all([
          api.getSafetyIncidentsByCompany(user.companyId),
          api.getProjectsByCompany(user.companyId)
        ]);
        setIncidents(incidentsResult);
        setProjects(projectsResult);
      } catch (error) {
        addToast('Failed to load safety data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [addToast]);

  if (loading) return <Card>Loading safety data...</Card>;

  const openIncidents = incidents.filter(i => i.status !== IncidentStatus.RESOLVED);
  const resolvedIncidents = incidents.filter(i => i.status === IncidentStatus.RESOLVED);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Safety Management</h1>
        <Button>Report Incident</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Open Incidents</h3>
            <p className="text-3xl font-bold text-red-600">{openIncidents.length}</p>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Resolved</h3>
            <p className="text-3xl font-bold text-green-600">{resolvedIncidents.length}</p>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Total Incidents</h3>
            <p className="text-3xl font-bold text-blue-600">{incidents.length}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Incidents</h3>
            <div className="space-y-3">
              {incidents.slice(0, 10).map((incident) => (
                <div key={incident.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{incident.title}</h4>
                    <p className="text-sm text-gray-500">
                      {incident.severity} • {new Date(incident.incidentDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${incident.status !== IncidentStatus.RESOLVED ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}
                  >
                    {incident.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Safety Analytics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Incident Rate</span>
                <span className="font-medium">{(incidents.length / Math.max(projects.length, 1) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Resolution Rate</span>
                <span className="font-medium">{incidents.length > 0 ? Math.round(resolvedIncidents.length / incidents.length * 100) : 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Days Since Last Incident</span>
                <span className="font-medium">
                  {incidents.length > 0 ? Math.floor((Date.now() - Math.max(...incidents.map(i => new Date(i.incidentDate).getTime()))) / (1000 * 60 * 60 * 24)) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
