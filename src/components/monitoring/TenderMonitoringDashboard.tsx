import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { 
    tenderMonitoringService, 
    TenderSource, 
    MonitoringAlert, 
    RelevanceFilter 
} from '../../services/tenderMonitoring';
import { User } from '../../types';
import { TenderOpportunity } from '../../types/procurement';interface TenderMonitoringDashboardProps {
    user: User;
    onTenderDiscovered?: (tende                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSource({...newSource, url: e.target.value})}: Tender                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewSource({...newSource, type: e.target.value as any})}pportunity) => void;
}

export const TenderMonitoringDashboard: React.FC<TenderMonitoringDashboardProps> = ({
    user,
    onTenderDiscovered
}) => {
    const [sources, setSources] = useState<TenderSource[]>([]);
    const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
    const [filters, setFilters] = useState<RelevanceFilter[]>([]);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [stats, setStats] = useState(tenderMonitoringService.getMonitoringStats());
    const [activeTab, setActiveTab] = useState<'dashboard' | 'sources' | 'alerts' | 'filters'>('dashboard');
    const [showAddSourceModal, setShowAddSourceModal] = useState(false);
    const [showAddFilterModal, setShowAddFilterModal] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState<MonitoringAlert | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    // New source form
    const [newSource, setNewSource] = useState({
        name: '',
        url: '',
        type: 'government' as const,
        region: '',
        apiKey: '',
    });

    // New filter form
    const [newFilter, setNewFilter] = useState({
        keywords: '',
        excludeKeywords: '',
        minValue: 0,
        maxValue: 10000000,
        regions: '',
        sectors: '',
        deadlineBuffer: 30,
        experienceRequired: '',
    });

    useEffect(() => {
        refreshData();

        // Request notification permissions
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Check if monitoring was previously active
        const wasMonitoring = localStorage.getItem('tender_monitoring_active') === 'true';
        if (wasMonitoring) {
            handleStartMonitoring();
        }
    }, []);

    const refreshData = () => {
        setSources(tenderMonitoringService.getSources());
        setAlerts(tenderMonitoringService.getAlerts());
        setFilters(tenderMonitoringService.getRelevanceFilters());
        setStats(tenderMonitoringService.getMonitoringStats());
        setIsMonitoring(tenderMonitoringService.isMonitoringActive());
    };

    const handleStartMonitoring = () => {
        tenderMonitoringService.startMonitoring(6); // Every 6 hours
        localStorage.setItem('tender_monitoring_active', 'true');
        setIsMonitoring(true);
    };

    const handleStopMonitoring = () => {
        tenderMonitoringService.stopMonitoring();
        localStorage.setItem('tender_monitoring_active', 'false');
        setIsMonitoring(false);
    };

    const handleManualScan = async () => {
        setIsScanning(true);
        try {
            const discoveredTenders = await tenderMonitoringService.scanAllSources();
            refreshData();

            // Notify parent component of discovered tenders
            discoveredTenders.forEach((tender: TenderOpportunity) => {
                onTenderDiscovered?.(tender);
            });

            alert(`Manual scan completed! Discovered ${discoveredTenders.length} new tenders.`);
        } catch (error) {
            console.error('Manual scan failed:', error);
            alert('Manual scan failed. Please check the console for details.');
        } finally {
            setIsScanning(false);
        }
    };

    const handleAddSource = () => {
        if (!newSource.name || !newSource.url) return;

        const source = tenderMonitoringService.addSource({
            name: newSource.name,
            url: newSource.url,
            type: newSource.type,
            region: newSource.region,
            active: true,
            credentials: newSource.apiKey ? { apiKey: newSource.apiKey } : undefined,
        });

        refreshData();
        setShowAddSourceModal(false);
        setNewSource({ name: '', url: '', type: 'government', region: '', apiKey: '' });
    };

    const handleToggleSource = (sourceId: string, active: boolean) => {
        tenderMonitoringService.updateSource(sourceId, { active });
        refreshData();
    };

    const handleRemoveSource = (sourceId: string) => {
        if (confirm('Are you sure you want to remove this tender source?')) {
            tenderMonitoringService.removeSource(sourceId);
            refreshData();
        }
    };

    const handleAddFilter = () => {
        if (!newFilter.keywords) return;

        const filter: RelevanceFilter = {
            keywords: newFilter.keywords.split(',').map(k => k.trim()).filter(k => k),
            excludeKeywords: newFilter.excludeKeywords.split(',').map(k => k.trim()).filter(k => k),
            minValue: newFilter.minValue,
            maxValue: newFilter.maxValue,
            regions: newFilter.regions.split(',').map(r => r.trim()).filter(r => r),
            sectors: newFilter.sectors.split(',').map(s => s.trim()).filter(s => s),
            deadlineBuffer: newFilter.deadlineBuffer,
            experienceRequired: newFilter.experienceRequired.split(',').map(e => e.trim()).filter(e => e),
        };

        tenderMonitoringService.addRelevanceFilter(filter);
        refreshData();
        setShowAddFilterModal(false);
        setNewFilter({
            keywords: '',
            excludeKeywords: '',
            minValue: 0,
            maxValue: 10000000,
            regions: '',
            sectors: '',
            deadlineBuffer: 30,
            experienceRequired: '',
        });
    };

    const handleMarkAlertRead = (alertId: string) => {
        tenderMonitoringService.markAlertAsRead(alertId);
        refreshData();
    };

    const handleDeleteAlert = (alertId: string) => {
        tenderMonitoringService.deleteAlert(alertId);
        refreshData();
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'bg-red-100 text-red-800 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getSourceTypeIcon = (type: string) => {
        switch (type) {
            case 'government': return '🏛️';
            case 'private': return '🏢';
            case 'international': return '🌍';
            case 'industry_specific': return '🏗️';
            default: return '📄';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            🔍 External Tender Monitoring
                        </h1>
                        <p className="text-gray-600">
                            Automated discovery and monitoring of tender opportunities from multiple sources
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
                            variant={isMonitoring ? 'danger' : 'success'}
                            className="flex items-center gap-2"
                        >
                            {isMonitoring ? '⏹️ Stop Monitoring' : '▶️ Start Monitoring'}
                        </Button>
                        <Button
                            onClick={handleManualScan}
                            disabled={isScanning}
                            variant="primary"
                            className="flex items-center gap-2"
                        >
                            {isScanning ? '🔄 Scanning...' : '🔍 Manual Scan'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Active Sources</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.activeSources}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            🌐
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        of {stats.totalSources} total sources
                    </p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Unread Alerts</p>
                            <p className="text-2xl font-bold text-red-600">{stats.unreadAlerts}</p>
                        </div>
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                            🚨
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        of {stats.totalAlerts} total alerts
                    </p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Last Scan</p>
                            <p className="text-sm font-bold text-green-600">
                                {stats.lastScan ? stats.lastScan.toLocaleDateString() : 'Never'}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            ⏰
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Next: {stats.nextScan ? stats.nextScan.toLocaleDateString() : 'Not scheduled'}
                    </p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Status</p>
                            <p className={`text-sm font-bold ${isMonitoring ? 'text-green-600' : 'text-gray-500'}`}>
                                {isMonitoring ? 'Active' : 'Inactive'}
                            </p>
                        </div>
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isMonitoring ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                            {isMonitoring ? '✅' : '⏸️'}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Monitoring {isMonitoring ? 'enabled' : 'disabled'}
                    </p>
                </Card>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                            { id: 'sources', label: 'Sources', icon: '🌐' },
                            { id: 'alerts', label: 'Alerts', icon: '🚨' },
                            { id: 'filters', label: 'Filters', icon: '⚙️' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    {/* Recent Alerts */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            🚨 Recent Alerts
                        </h3>
                        <div className="space-y-3">
                            {alerts.slice(0, 5).map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`p-4 rounded-lg border ${alert.read ? 'bg-gray-50' : 'bg-white border-l-4 border-l-blue-500'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge className={getSeverityColor(alert.severity)}>
                                                    {alert.severity.toUpperCase()}
                                                </Badge>
                                                <span className="text-sm text-gray-500">
                                                    {alert.createdAt.toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {alert.message}
                                            </p>
                                            {alert.recommendedAction && (
                                                <p className="text-xs text-blue-600 mt-1">
                                                    💡 {alert.recommendedAction}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <span className="text-xs text-gray-500">
                                                {alert.relevanceScore}% match
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleMarkAlertRead(alert.id)}
                                                disabled={alert.read}
                                            >
                                                {alert.read ? '✓' : 'Mark Read'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {alerts.length === 0 && (
                                <p className="text-gray-500 text-center py-8">
                                    No alerts yet. Start monitoring to receive notifications.
                                </p>
                            )}
                        </div>
                    </Card>

                    {/* Active Sources Overview */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            🌐 Active Sources
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sources.filter(s => s.active).map((source) => (
                                <div key={source.id} className="p-4 border rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">{getSourceTypeIcon(source.type)}</span>
                                        <h4 className="font-medium text-gray-900">{source.name}</h4>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1">{source.region}</p>
                                    <p className="text-xs text-gray-500">
                                        Last scan: {source.lastScan.toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Next scan: {source.nextScan.toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'sources' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <Button onClick={() => setShowAddSourceModal(true)}>
                            ➕ Add Source
                        </Button>
                    </div>

                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Tender Sources</h3>
                        <div className="space-y-4">
                            {sources.map((source) => (
                                <div key={source.id} className="p-4 border rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">{getSourceTypeIcon(source.type)}</span>
                                            <div>
                                                <h4 className="font-medium text-gray-900">{source.name}</h4>
                                                <p className="text-sm text-gray-600">{source.url}</p>
                                                <p className="text-xs text-gray-500">
                                                    {source.type} • {source.region}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={source.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                                {source.active ? 'Active' : 'Inactive'}
                                            </Badge>
                                            <Button
                                                size="sm"
                                                variant={source.active ? 'danger' : 'success'}
                                                onClick={() => handleToggleSource(source.id, !source.active)}
                                            >
                                                {source.active ? 'Disable' : 'Enable'}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() => handleRemoveSource(source.id)}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'alerts' && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">All Alerts</h3>
                        <div className="space-y-3">
                            {alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`p-4 rounded-lg border ${alert.read ? 'bg-gray-50' : 'bg-white border-l-4 border-l-blue-500'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge className={getSeverityColor(alert.severity)}>
                                                    {alert.severity.toUpperCase()}
                                                </Badge>
                                                <span className="text-sm text-gray-500">
                                                    {alert.createdAt.toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {alert.message}
                                            </p>
                                            {alert.recommendedAction && (
                                                <p className="text-xs text-blue-600 mt-1">
                                                    💡 {alert.recommendedAction}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <span className="text-xs text-gray-500">
                                                {alert.relevanceScore}% match
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleMarkAlertRead(alert.id)}
                                                disabled={alert.read}
                                            >
                                                {alert.read ? '✓' : 'Mark Read'}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() => handleDeleteAlert(alert.id)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {alerts.length === 0 && (
                                <p className="text-gray-500 text-center py-8">
                                    No alerts yet. Start monitoring to receive notifications.
                                </p>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'filters' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <Button onClick={() => setShowAddFilterModal(true)}>
                            ➕ Add Filter
                        </Button>
                    </div>

                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Relevance Filters</h3>
                        <div className="space-y-4">
                            {filters.map((filter, index) => (
                                <div key={index} className="p-4 border rounded-lg">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Keywords:</p>
                                            <p className="text-sm text-gray-600">{filter.keywords.join(', ')}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Value Range:</p>
                                            <p className="text-sm text-gray-600">
                                                ${filter.minValue.toLocaleString()} - ${filter.maxValue.toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Regions:</p>
                                            <p className="text-sm text-gray-600">
                                                {filter.regions.length ? filter.regions.join(', ') : 'Any'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Sectors:</p>
                                            <p className="text-sm text-gray-600">
                                                {filter.sectors.length ? filter.sectors.join(', ') : 'Any'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filters.length === 0 && (
                                <p className="text-gray-500 text-center py-8">
                                    No filters configured. Add filters to improve relevance scoring.
                                </p>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* Add Source Modal */}
            <Modal
                isOpen={showAddSourceModal}
                onClose={() => setShowAddSourceModal(false)}
                title="Add Tender Source"
            >
                <div className="space-y-4">
                    <Input
                        label="Source Name"
                        value={newSource.name}
                        onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                        placeholder="e.g., Government Contracts Portal"
                    />
                    <Input
                        label="URL"
                        value={newSource.url}
                        onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                        placeholder="https://example.com"
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type
                        </label>
                        <select
                            value={newSource.type}
                            onChange={(e) => setNewSource({ ...newSource, type: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="government">Government</option>
                            <option value="private">Private</option>
                            <option value="international">International</option>
                            <option value="industry_specific">Industry Specific</option>
                        </select>
                    </div>
                    <Input
                        label="Region"
                        value={newSource.region}
                        onChange={(e) => setNewSource({ ...newSource, region: e.target.value })}
                        placeholder="e.g., National, Regional, City"
                    />
                    <Input
                        label="API Key (Optional)"
                        value={newSource.apiKey}
                        onChange={(e) => setNewSource({ ...newSource, apiKey: e.target.value })}
                        placeholder="API key if required"
                        type="password"
                    />
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" onClick={() => setShowAddSourceModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddSource}>
                            Add Source
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Add Filter Modal */}
            <Modal
                isOpen={showAddFilterModal}
                onClose={() => setShowAddFilterModal(false)}
                title="Add Relevance Filter"
            >
                <div className="space-y-4">
                    <Input
                        label="Keywords (comma-separated)"
                        value={newFilter.keywords}
                        onChange={(e) => setNewFilter({ ...newFilter, keywords: e.target.value })}
                        placeholder="construction, building, infrastructure"
                    />
                    <Input
                        label="Exclude Keywords (comma-separated)"
                        value={newFilter.excludeKeywords}
                        onChange={(e) => setNewFilter({ ...newFilter, excludeKeywords: e.target.value })}
                        placeholder="maintenance, cleaning"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Min Value ($)"
                            type="number"
                            value={newFilter.minValue}
                            onChange={(e) => setNewFilter({ ...newFilter, minValue: Number(e.target.value) })}
                        />
                        <Input
                            label="Max Value ($)"
                            type="number"
                            value={newFilter.maxValue}
                            onChange={(e) => setNewFilter({ ...newFilter, maxValue: Number(e.target.value) })}
                        />
                    </div>
                    <Input
                        label="Regions (comma-separated)"
                        value={newFilter.regions}
                        onChange={(e) => setNewFilter({ ...newFilter, regions: e.target.value })}
                        placeholder="California, Texas, New York"
                    />
                    <Input
                        label="Sectors (comma-separated)"
                        value={newFilter.sectors}
                        onChange={(e) => setNewFilter({ ...newFilter, sectors: e.target.value })}
                        placeholder="infrastructure, commercial, residential"
                    />
                    <Input
                        label="Deadline Buffer (days)"
                        type="number"
                        value={newFilter.deadlineBuffer}
                        onChange={(e) => setNewFilter({ ...newFilter, deadlineBuffer: Number(e.target.value) })}
                    />
                    <Input
                        label="Experience Required (comma-separated)"
                        value={newFilter.experienceRequired}
                        onChange={(e) => setNewFilter({ ...newFilter, experienceRequired: e.target.value })}
                        placeholder="5 years, commercial projects, LEED certification"
                    />
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" onClick={() => setShowAddFilterModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddFilter}>
                            Add Filter
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};