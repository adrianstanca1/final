import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import {
    tenderMonitoringService,
    TenderSource,
    MonitoringAlert,
    RelevanceFilter
} from '../../services/tenderMonitoring';
import { User } from '../../types';
import { TenderOpportunity } from '../../types/procurement';

interface TenderMonitoringDashboardProps {
    user: User;
    onTenderDiscovered?: (tender: TenderOpportunity) => void;
}

export const TenderMonitoringDashboard: React.FC<TenderMonitoringDashboardProps> = ({
    user,
    onTenderDiscovered
}) => {
    const [sources, setSources] = useState<TenderSource[]>([]);
    const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
    const [filters, setFilters] = useState<RelevanceFilter[]>([]);
    const [monitoring, setMonitoring] = useState(false);
    const [showAddSource, setShowAddSource] = useState(false);

    const [newSource, setNewSource] = useState<Partial<TenderSource>>({
        name: '',
        url: '',
        type: 'government',
        region: '',
        active: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [sourcesData, alertsData, filtersData] = await Promise.all([
                tenderMonitoringService.getSources(),
                tenderMonitoringService.getAlerts(),
                tenderMonitoringService.getRelevanceFilters()
            ]);
            setSources(sourcesData);
            setAlerts(alertsData);
            setFilters(filtersData);
        } catch (error) {
            console.error('Failed to load monitoring data:', error);
        }
    };

    const handleStartMonitoring = async () => {
        try {
            setMonitoring(true);
            tenderMonitoringService.startMonitoring(6);
            await loadData();
        } catch (error) {
            console.error('Failed to start monitoring:', error);
            setMonitoring(false);
        }
    };

    const handleStopMonitoring = () => {
        setMonitoring(false);
        tenderMonitoringService.stopMonitoring();
    };

    const handleAddSource = async () => {
        try {
            if (!newSource.name || !newSource.url) return;

            const source = await tenderMonitoringService.addSource(newSource as TenderSource);
            setSources(prev => [...prev, source]);
            setNewSource({
                name: '',
                url: '',
                type: 'government',
                region: '',
                active: true
            });
            setShowAddSource(false);
        } catch (error) {
            console.error('Failed to add source:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Tender Monitoring</h2>
                    <p className="text-gray-600">
                        Monitor tender sources and get real-time alerts
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={monitoring ? handleStopMonitoring : handleStartMonitoring}
                    >
                        {monitoring ? 'Stop Monitoring' : 'Start Monitoring'}
                    </Button>
                    <Button onClick={loadData} variant="secondary">
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{sources.length}</div>
                    <div className="text-sm text-gray-600">Active Sources</div>
                </Card>
                <Card className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                        {sources.filter(s => s.active).length}
                    </div>
                    <div className="text-sm text-gray-600">Enabled Sources</div>
                </Card>
                <Card className="p-4">
                    <div className="text-2xl font-bold text-orange-600">{alerts.length}</div>
                    <div className="text-sm text-gray-600">Recent Alerts</div>
                </Card>
                <Card className="p-4">
                    <div className="text-2xl font-bold text-purple-600">{filters.length}</div>
                    <div className="text-sm text-gray-600">Active Filters</div>
                </Card>
            </div>

            <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Tender Sources</h3>
                    <Button onClick={() => setShowAddSource(true)}>
                        Add Source
                    </Button>
                </div>

                <div className="space-y-3">
                    {sources.map(source => (
                        <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <Tag label={source.active ? 'Active' : 'Disabled'} color={source.active ? 'green' : 'gray'} />
                                <div>
                                    <div className="font-medium">{source.name}</div>
                                    <div className="text-sm text-gray-600">{source.url}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {showAddSource && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddSource(false)}>
                    <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4">Add Tender Source</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Source Name</label>
                                <input
                                    type="text"
                                    value={newSource.name || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSource({ ...newSource, name: e.target.value })}
                                    placeholder="Government Contracts Portal"
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">URL</label>
                                <input
                                    type="url"
                                    value={newSource.url || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSource({ ...newSource, url: e.target.value })}
                                    placeholder="https://contracts.gov/api/tenders"
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="secondary" onClick={() => setShowAddSource(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleAddSource}>
                                    Add Source
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
