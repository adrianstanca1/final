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
    const [showAddFilter, setShowAddFilter] = useState(false);
    
    const [newSource, setNewSource] = useState<Partial<TenderSource>>({
        name: '',
        url: '',
        type: 'government',
        region: '',
        enabled: true
    });
    
    const [newFilter, setNewFilter] = useState<Partial<RelevanceFilter>>({
        keywords: [],
        minValue: 0,
        maxValue: 1000000,
        categories: [],
        regions: [],
        deadlineBuffer: 30,
        enabled: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [sourcesData, alertsData, filtersData] = await Promise.all([
                tenderMonitoringService.getSources(),
                tenderMonitoringService.getAlerts(),
                tenderMonitoringService.getFilters()
            ]);
            setSources(sourcesData);
            setAlerts(alertsData);
            setFilters(filtersData);
            
            const wasMonitoring = localStorage.getItem('tender_monitoring_active') === 'true';
            if (wasMonitoring) {
                setMonitoring(true);
                tenderMonitoringService.startMonitoring(filtersData);
            }
        } catch (error) {
            console.error('Failed to load monitoring data:', error);
        }
    };

    const handleStartMonitoring = async () => {
        try {
            setMonitoring(true);
            localStorage.setItem('tender_monitoring_active', 'true');
            tenderMonitoringService.startMonitoring(filters);
            
            const discoveredTenders = await tenderMonitoringService.scanAllSources();
            discoveredTenders.forEach(tender => {
                if (onTenderDiscovered) {
                    onTenderDiscovered(tender);
                }
            });
            
            await loadData();
        } catch (error) {
            console.error('Failed to start monitoring:', error);
            setMonitoring(false);
        }
    };

    const handleStopMonitoring = () => {
        setMonitoring(false);
        localStorage.setItem('tender_monitoring_active', 'false');
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
                enabled: true
            });
            setShowAddSource(false);
        } catch (error) {
            console.error('Failed to add source:', error);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'red';
            case 'medium': return 'yellow';
            case 'low': return 'green';
            default: return 'gray';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
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
                        className={monitoring ? 'bg-red-600' : 'bg-green-600'}
                    >
                        {monitoring ? 'Stop Monitoring' : 'Start Monitoring'}
                    </Button>
                    <Button onClick={loadData} variant="outline">
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{sources.length}</div>
                    <div className="text-sm text-gray-600">Active Sources</div>
                </Card>
                <Card className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                        {sources.filter(s => s.enabled).length}
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

            {/* Sources Management */}
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
                                <Badge color={source.enabled ? 'green' : 'gray'}>
                                    {source.enabled ? 'Active' : 'Disabled'}
                                </Badge>
                                <div>
                                    <div className="font-medium">{source.name}</div>
                                    <div className="text-sm text-gray-600">{source.url}</div>
                                    <div className="text-xs text-gray-500">
                                        {source.type} • {source.region}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Recent Alerts */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
                <div className="space-y-3">
                    {alerts.slice(0, 10).map(alert => (
                        <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg">
                            <div className="flex items-start gap-3">
                                <Badge color={getPriorityColor(alert.priority)}>
                                    {alert.priority}
                                </Badge>
                                <div>
                                    <div className="font-medium">{alert.title}</div>
                                    <div className="text-sm text-gray-600">{alert.message}</div>
                                    <div className="text-xs text-gray-500">
                                        {new Date(alert.timestamp).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Add Source Modal */}
            <Modal
                isOpen={showAddSource}
                onClose={() => setShowAddSource(false)}
                title="Add Tender Source"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Source Name</label>
                        <Input
                            value={newSource.name || ''}
                            onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                            placeholder="Government Contracts Portal"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">URL</label>
                        <Input
                            value={newSource.url || ''}
                            onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                            placeholder="https://contracts.gov/api/tenders"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setShowAddSource(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddSource}>
                            Add Source
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );

    const [isMonitoring, setIsMonitoring] = useState(false); const [filters, setFilters] = useState<RelevanceFilter[]>([]);

    const [stats, setStats] = useState(tenderMonitoringService.getMonitoringStats()); const [isMonitoring, setIsMonitoring] = useState(false);

    const [activeTab, setActiveTab] = useState<'dashboard' | 'sources' | 'alerts' | 'filters'>('dashboard'); const [stats, setStats] = useState(tenderMonitoringService.getMonitoringStats());

    const [isScanning, setIsScanning] = useState(false); const [activeTab, setActiveTab] = useState<'dashboard' | 'sources' | 'alerts' | 'filters'>('dashboard');

    const [showAddSourceModal, setShowAddSourceModal] = useState(false);

    useEffect(() => {
        const [showAddFilterModal, setShowAddFilterModal] = useState(false);

        refreshData(); const [selectedAlert, setSelectedAlert] = useState<MonitoringAlert | null>(null);

        const [isScanning, setIsScanning] = useState(false);

        // Request notification permissions

        if ('Notification' in window && Notification.permission === 'default') {    // New source form

            Notification.requestPermission(); const [newSource, setNewSource] = useState({

            }        name: '',

                url: '',

        // Check if monitoring was previously active        type: 'government' as const,

        const wasMonitoring = localStorage.getItem('tender_monitoring_active') === 'true'; region: '',

        if (wasMonitoring) {
                apiKey: '',

                    handleStartMonitoring();
            });

}

    }, []);    // New filter form

const [newFilter, setNewFilter] = useState({

    const refreshData = () => {
        keywords: '',

            setSources(tenderMonitoringService.getSources()); excludeKeywords: '',

                setAlerts(tenderMonitoringService.getAlerts()); minValue: 0,

                    setFilters(tenderMonitoringService.getRelevanceFilters()); maxValue: 10000000,

                        setStats(tenderMonitoringService.getMonitoringStats()); regions: '',

                            setIsMonitoring(tenderMonitoringService.isMonitoringActive()); sectors: '',

    }; deadlineBuffer: 30,

    experienceRequired: '',

    const handleStartMonitoring = () => { });

tenderMonitoringService.startMonitoring(6); // Every 6 hours

localStorage.setItem('tender_monitoring_active', 'true'); useEffect(() => {

    setIsMonitoring(true); refreshData();

};

// Request notification permissions

const handleStopMonitoring = () => {
    if ('Notification' in window && Notification.permission === 'default') {

        tenderMonitoringService.stopMonitoring(); Notification.requestPermission();

        localStorage.setItem('tender_monitoring_active', 'false');
    }

    setIsMonitoring(false);

};        // Check if monitoring was previously active

const wasMonitoring = localStorage.getItem('tender_monitoring_active') === 'true';

const handleManualScan = async () => {
    if (wasMonitoring) {

        setIsScanning(true); handleStartMonitoring();

        try { }

            const discoveredTenders = await tenderMonitoringService.scanAllSources();
    }, []);

    refreshData();

    const refreshData = () => {

        // Notify parent component of discovered tenders        setSources(tenderMonitoringService.getSources());

        discoveredTenders.forEach((tender: TenderOpportunity) => {
            setAlerts(tenderMonitoringService.getAlerts());

            onTenderDiscovered?.(tender); setFilters(tenderMonitoringService.getRelevanceFilters());

        }); setStats(tenderMonitoringService.getMonitoringStats());

        setIsMonitoring(tenderMonitoringService.isMonitoringActive());

        alert(`Manual scan completed! Discovered ${discoveredTenders.length} new tenders.`);
    };

} catch (error) {

    console.error('Manual scan failed:', error); const handleStartMonitoring = () => {

        alert('Manual scan failed. Please check the console for details.'); tenderMonitoringService.startMonitoring(6); // Every 6 hours

    } finally {
        localStorage.setItem('tender_monitoring_active', 'true');

        setIsScanning(false); setIsMonitoring(true);

    }
};

    };

const handleStopMonitoring = () => {

    const handleToggleSource = (sourceId: string, active: boolean) => {
        tenderMonitoringService.stopMonitoring();

        tenderMonitoringService.updateSource(sourceId, { active }); localStorage.setItem('tender_monitoring_active', 'false');

        refreshData(); setIsMonitoring(false);

    };
};



const handleRemoveSource = (sourceId: string) => {
    const handleManualScan = async () => {

        if (confirm('Are you sure you want to remove this tender source?')) {
            setIsScanning(true);

            tenderMonitoringService.removeSource(sourceId); try {

                refreshData(); const discoveredTenders = await tenderMonitoringService.scanAllSources();

            }            refreshData();

        };

        // Notify parent component of discovered tenders

        const handleMarkAlertRead = (alertId: string) => {
            discoveredTenders.forEach((tender: TenderOpportunity) => {

                tenderMonitoringService.markAlertAsRead(alertId); onTenderDiscovered?.(tender);

                refreshData();
            });

        };

        alert(`Manual scan completed! Discovered ${discoveredTenders.length} new tenders.`);

        const handleDeleteAlert = (alertId: string) => { } catch (error) {

            tenderMonitoringService.deleteAlert(alertId); console.error('Manual scan failed:', error);

            refreshData(); alert('Manual scan failed. Please check the console for details.');

        };
    } finally {

        setIsScanning(false);

        const getSeverityColor = (severity: string) => { }

        switch (severity) { };

            case 'high': return 'bg-red-100 text-red-800 border-red-200';

            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'; const handleAddSource = () => {

            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'; if (!newSource.name || !newSource.url) return;

            default: return 'bg-gray-100 text-gray-800 border-gray-200';

        }        const source = tenderMonitoringService.addSource({

        }; name: newSource.name,

            url: newSource.url,

    const getSourceTypeIcon = (type: string) => {
    type: newSource.type,

        switch (type) {            region: newSource.region,

            case 'government': return '🏛️'; active: true,

            case 'private': return '🏢'; credentials: newSource.apiKey ? { apiKey: newSource.apiKey } : undefined,

            case 'international': return '🌍';        });

            case 'industry_specific': return '🏗️';

            default: return '📄'; refreshData();

        }        setShowAddSourceModal(false);

    }; setNewSource({ name: '', url: '', type: 'government', region: '', apiKey: '' });

    };

return (

    <div className="p-6 max-w-7xl mx-auto">    const handleToggleSource = (sourceId: string, active: boolean) => {

        {/* Header */ }        tenderMonitoringService.updateSource(sourceId, {active});

        <div className="mb-8">        refreshData();

            <div className="flex items-center justify-between">    };

                <div>

                    <h1 className="text-3xl font-bold text-gray-900 mb-2">    const handleRemoveSource = (sourceId: string) => {

                            🔍 External Tender Monitoring        if (confirm('Are you sure you want to remove this tender source?')) {

                        </h1>            tenderMonitoringService.removeSource(sourceId);

                    <p className="text-gray-600">            refreshData();

                            Automated discovery and monitoring of tender opportunities from multiple sources        }

                    </p>    };

                </div>

                <div className="flex items-center gap-3">    const handleAddFilter = () => {

                    <Button if (!newFilter.keywords) return;

                    onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}

                    variant={isMonitoring ? 'danger' : 'success'}        const filter: RelevanceFilter = {

                        className = "flex items-center gap-2"            keywords: newFilter.keywords.split(',').map(k => k.trim()).filter(k => k),

                        >            excludeKeywords: newFilter.excludeKeywords.split(',').map(k => k.trim()).filter(k => k),

                    {isMonitoring ? '⏹️ Stop Monitoring' : '▶️ Start Monitoring'}            minValue: newFilter.minValue,

                </Button>            maxValue: newFilter.maxValue,

                <Button regions:newFilter.regions.split(',').map(r => r.trim()).filter(r => r),

                onClick={handleManualScan}            sectors: newFilter.sectors.split(',').map(s => s.trim()).filter(s => s),

                disabled={isScanning}            deadlineBuffer: newFilter.deadlineBuffer,

                            variant="primary"            experienceRequired: newFilter.experienceRequired.split(',').map(e => e.trim()).filter(e => e),

                            className="flex items-center gap-2"        };

                        >

                {isScanning ? '🔄 Scanning...' : '🔍 Manual Scan'}        tenderMonitoringService.addRelevanceFilter(filter);

            </Button>        refreshData();

        </div>        setShowAddFilterModal(false);

    </div>        setNewFilter({

            </div> keywords: '',

        excludeKeywords: '',

        {/* Stats Cards */ }            minValue: 0,

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">            maxValue: 10000000,

            <Card className="p-6">            regions: '',

                <div className="flex items-center justify-between">            sectors: '',

                    <div>            deadlineBuffer: 30,

                        <p className="text-sm font-medium text-gray-600">Active Sources</p>            experienceRequired: '',

                        <p className="text-2xl font-bold text-blue-600">{stats.activeSources}</p>        });

                    </div>    };

                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">

                            🌐    const handleMarkAlertRead = (alertId: string) => {

                        </div>        tenderMonitoringService.markAlertAsRead(alertId);

                </div>        refreshData();

                <p className="text-xs text-gray-500 mt-2">    };

                    of {stats.totalSources} total sources

                </p>    const handleDeleteAlert = (alertId: string) => {

                </Card>        tenderMonitoringService.deleteAlert(alertId);

            refreshData();

            <Card className="p-6">    };

                <div className="flex items-center justify-between">

                    <div>    const getSeverityColor = (severity: string) => {

                        <p className="text-sm font-medium text-gray-600">Unread Alerts</p>        switch (severity) {

                            <p className="text-2xl font-bold text-red-600">{stats.unreadAlerts}</p>            case 'high': return 'bg-red-100 text-red-800 border-red-200';

                    </div>            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';

                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';

                        🚨            default: return 'bg-gray-100 text-gray-800 border-gray-200';

                    </div>        }

                </div>    };

                <p className="text-xs text-gray-500 mt-2">

                    of {stats.totalAlerts} total alerts    const getSourceTypeIcon = (type: string) => {

                    </p>        switch (type) {

                </Card>            case 'government': return '🏛️';

            case 'private': return '🏢';

            <Card className="p-6">            case 'international': return '🌍';

                <div className="flex items-center justify-between">            case 'industry_specific': return '🏗️';

                    <div>            default: return '📄';

                        <p className="text-sm font-medium text-gray-600">Last Scan</p>        }

                        <p className="text-sm font-bold text-green-600">    };

                            {stats.lastScan ? stats.lastScan.toLocaleDateString() : 'Never'}

                        </p>    return (

                    </div>        <div className="p-6 max-w-7xl mx-auto">

                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">            {/* Header */}

                            ⏰            <div className="mb-8">

                            </div>                <div className="flex items-center justify-between">

                            </div>                    <div>

                                <p className="text-xs text-gray-500 mt-2">                        <h1 className="text-3xl font-bold text-gray-900 mb-2">

                                    Next: {stats.nextScan ? stats.nextScan.toLocaleDateString() : 'Not scheduled'}                            🔍 External Tender Monitoring

                                </p>                        </h1>

                        </Card>                        <p className="text-gray-600">

                            Automated discovery and monitoring of tender opportunities from multiple sources

                            <Card className="p-6">                        </p>

                        <div className="flex items-center justify-between">                    </div>

                        <div>                    <div className="flex items-center gap-3">

                            <p className="text-sm font-medium text-gray-600">Status</p>                        <Button

                                <p className={`text-sm font-bold ${isMonitoring ? 'text-green-600' : 'text-gray-500'}`}>                            onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}

                                {isMonitoring ? 'Active' : 'Inactive'}                            variant={isMonitoring ? 'danger' : 'success'}

                            </p>                            className="flex items-center gap-2"

                        </div>                        >

                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${{ isMonitoring? '⏹️ Stop Monitoring': '▶️ Start Monitoring' }

                            isMonitoring ? 'bg-green-100' : 'bg-gray-100'                        </Button>

                        }`}>                        <Button

                            {isMonitoring ? '✅' : '⏸️'} onClick={handleManualScan}

                        </div>                            disabled={isScanning}

                </div>                            variant="primary"

                <p className="text-xs text-gray-500 mt-2">                            className="flex items-center gap-2"

                    Monitoring {isMonitoring ? 'enabled' : 'disabled'}                        >

                </p>                            {isScanning ? '🔄 Scanning...' : '🔍 Manual Scan'}

            </Card>                        </Button>

            </div >                    </div >

                </div >

        {/* Tab Navigation */ }            </div >

    <div className="mb-6">

        <div className="border-b border-gray-200">            {/* Stats Cards */}

            <nav className="-mb-px flex space-x-8">            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

                {[<Card className="p-6">

                    {id: 'dashboard', label: 'Dashboard', icon: '📊' },                    <div className="flex items-center justify-between">

                        {id: 'sources', label: 'Sources', icon: '🌐' },                        <div>

                            {id: 'alerts', label: 'Alerts', icon: '🚨' },                            <p className="text-sm font-medium text-gray-600">Active Sources</p>

                            {id: 'filters', label: 'Filters', icon: '⚙️' },                            <p className="text-2xl font-bold text-blue-600">{stats.activeSources}</p>

                        ].map((tab) => (                        </div>

                        <button                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">

                            key={tab.id}                            🌐

                            onClick={() => setActiveTab(tab.id as any)}                        </div>

                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${                    </div>

                                    activeTab === tab.id < p className = "text-xs text-gray-500 mt-2" >

                                        ? 'border-blue-500 text-blue-600'                        of { stats.totalSources } total sources

                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'                    </p>

                                }`}                </Card>

                            >

            <span>{tab.icon}</span>                <Card className="p-6">

                {tab.label}                    <div className="flex items-center justify-between">

                </button>                        <div>

                        ))}                            <p className="text-sm font-medium text-gray-600">Unread Alerts</p>

                </nav>                            <p className="text-2xl font-bold text-red-600">{stats.unreadAlerts}</p>

        </div>                        </div>

            </div > <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">

            🚨

            {/* Tab Content */}                        </div>

            { activeTab === 'dashboard' && (                    </div >

                <div className="space-y-6">                    <p className="text-xs text-gray-500 mt-2">

                    {/* Recent Alerts */}                        of {stats.totalAlerts} total alerts

                    <Card className="p-6">                    </p>

                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">                </Card>

                            🚨 Recent Alerts

                        </h3>                <Card className="p-6">

                        <div className="space-y-3">                    <div className="flex items-center justify-between">

                            {alerts.slice(0, 5).map((alert) => (                        <div>

                                <div                            <p className="text-sm font-medium text-gray-600">Last Scan</p>

                                    key={alert.id}                            <p className="text-sm font-bold text-green-600">

                                    className={`p-4 rounded-lg border ${                                {stats.lastScan ? stats.lastScan.toLocaleDateString() : 'Never'}

                                        alert.read ? 'bg-gray-50' : 'bg-white border-l-4 border-l-blue-500'                            </p>

                                    }`}                        </div>

                                >                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">

                                    <div className="flex items-start justify-between">                            ⏰

                                        <div className="flex-1">                        </div>

                                            <div className="flex items-center gap-2 mb-1">                    </div>

                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(alert.severity)}`}>                    <p className="text-xs text-gray-500 mt-2">

                                                    {alert.severity.toUpperCase()}                        Next: {stats.nextScan ? stats.nextScan.toLocaleDateString() : 'Not scheduled'}

                                                </span>                    </p>

                                                <span className="text-sm text-gray-500">                </Card>

                                                    {alert.createdAt.toLocaleString()}

                                                </span>                <Card className="p-6">

                                            </div>                    <div className="flex items-center justify-between">

                                            <p className="text-sm font-medium text-gray-900">                        <div>

                                                {alert.message}                            <p className="text-sm font-medium text-gray-600">Status</p>

                                            </p>                            <p className={`text-sm font-bold ${isMonitoring ? 'text-green-600' : 'text-gray-500'}`}>

                                            {alert.recommendedAction && (                                {isMonitoring ? 'Active' : 'Inactive'}

                                                <p className="text-xs text-blue-600 mt-1">                            </p>

                                                    💡 {alert.recommendedAction}                        </div>

                                                </p>                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isMonitoring ? 'bg-green-100' : 'bg-gray-100'

                                            )}                            }`}>

                                        </div>                            {isMonitoring ? '✅' : '⏸️'}

                                        <div className="flex items-center gap-2 ml-4">                        </div>

                                            <span className="text-xs text-gray-500">                    </div>

                                                {alert.relevanceScore}% match                    <p className="text-xs text-gray-500 mt-2">

                                            </span>                        Monitoring {isMonitoring ? 'enabled' : 'disabled'}

                                            <Button                    </p>

                                                size = "sm"                </Card >

    variant="ghost"            </div >

    onClick={() => handleMarkAlertRead(alert.id)}

        disabled = { alert.read }            {/* Tab Navigation */ }

    > <div className="mb-6">

        {alert.read ? '✓' : 'Mark Read'}                <div className="border-b border-gray-200">

        </Button>                    <nav className="-mb-px flex space-x-8">

    </div>                        {
        [

                                    </div> { id: 'dashboard', label: 'Dashboard', icon: '📊' },

                                </div > { id: 'sources', label: 'Sources', icon: '🌐' },

    ))}                            { id: 'alerts', label: 'Alerts', icon: '🚨' },

{
    alerts.length === 0 && ({ id: 'filters', label: 'Filters', icon: '⚙️' },

        <p className="text-gray-500 text-center py-8">                        ].map((tab) => (

            No alerts yet. Start monitoring to receive notifications.                            <button

                                </p>                                key = { tab.id }

                            )
} onClick = {() => setActiveTab(tab.id as any)}

                        </div > className={
    `py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === tab.id

                    </Card >                                    ? 'border-blue-500 text-blue-600'

        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'

    {/* Active Sources Overview */ }
} `}

                    <Card className="p-6">                            >

                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">                                <span>{tab.icon}</span>

                            🌐 Active Sources                                {tab.label}

                        </h3>                            </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">                        ))}

                            {sources.filter(s => s.active).map((source) => (                    </nav>

                                <div key={source.id} className="p-4 border rounded-lg">                </div>

                                    <div className="flex items-center gap-2 mb-2">            </div>

                                        <span className="text-lg">{getSourceTypeIcon(source.type)}</span>

                                        <h4 className="font-medium text-gray-900">{source.name}</h4>            {/* Tab Content */}

                                    </div>            {activeTab === 'dashboard' && (

                                    <p className="text-sm text-gray-600 mb-1">{source.region}</p>                <div className="space-y-6">

                                    <p className="text-xs text-gray-500">                    {/* Recent Alerts */}

                                        Last scan: {source.lastScan.toLocaleDateString()}                    <Card className="p-6">

                                    </p>                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">

                                    <p className="text-xs text-gray-500">                            🚨 Recent Alerts

                                        Next scan: {source.nextScan.toLocaleDateString()}                        </h3>

                                    </p>                        <div className="space-y-3">

                                </div>                            {alerts.slice(0, 5).map((alert) => (

                            ))}                                <div

                        </div>                                    key={alert.id}

                    </Card>                                    className={`p - 4 rounded - lg border ${
    alert.read ? 'bg-gray-50' : 'bg-white border-l-4 border-l-blue-500'

                </div >                                        } `}

            )}                                >

                                    <div className="flex items-start justify-between">

            {/* Simple sources management */}                                        <div className="flex-1">

            {activeTab === 'sources' && (                                            <div className="flex items-center gap-2 mb-1">

                <div className="space-y-6">                                                <Badge className={getSeverityColor(alert.severity)}>

                    <Card className="p-6">                                                    {alert.severity.toUpperCase()}

                        <h3 className="text-lg font-semibold mb-4">Tender Sources</h3>                                                </Badge>

                        <div className="space-y-4">                                                <span className="text-sm text-gray-500">

                            {sources.map((source) => (                                                    {alert.createdAt.toLocaleString()}

                                <div key={source.id} className="p-4 border rounded-lg">                                                </span>

                                    <div className="flex items-center justify-between">                                            </div>

                                        <div className="flex items-center gap-3">                                            <p className="text-sm font-medium text-gray-900">

                                            <span className="text-xl">{getSourceTypeIcon(source.type)}</span>                                                {alert.message}

                                            <div>                                            </p>

                                                <h4 className="font-medium text-gray-900">{source.name}</h4>                                            {alert.recommendedAction && (

                                                <p className="text-sm text-gray-600">{source.url}</p>                                                <p className="text-xs text-blue-600 mt-1">

                                                <p className="text-xs text-gray-500">                                                    💡 {alert.recommendedAction}

                                                    {source.type} • {source.region}                                                </p>

                                                </p>                                            )}

                                            </div>                                        </div>

                                        </div>                                        <div className="flex items-center gap-2 ml-4">

                                        <div className="flex items-center gap-2">                                            <span className="text-xs text-gray-500">

                                            <span className={`px - 2 py - 1 rounded text - xs font - semibold ${
    { alert.relevanceScore }% match

    source.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'                                            </span >

                                            } `}>                                            <Button

                                                {source.active ? 'Active' : 'Inactive'}                                                size="sm"

                                            </span>                                                variant="ghost"

                                            <Button                                                onClick={() => handleMarkAlertRead(alert.id)}

                                                size="sm"                                                disabled={alert.read}

                                                variant={source.active ? 'danger' : 'success'}                                            >

                                                onClick={() => handleToggleSource(source.id, !source.active)}                                                {alert.read ? '✓' : 'Mark Read'}

                                            >                                            </Button>

                                                {source.active ? 'Disable' : 'Enable'}                                        </div>

                                            </Button>                                    </div>

                                            <Button                                </div>

                                                size="sm"                            ))}

                                                variant="danger"                            {alerts.length === 0 && (

                                                onClick={() => handleRemoveSource(source.id)}                                <p className="text-gray-500 text-center py-8">

                                            >                                    No alerts yet. Start monitoring to receive notifications.

                                                Remove                                </p>

                                            </Button>                            )}

                                        </div>                        </div>

                                    </div>                    </Card>

                                </div>

                            ))}                    {/* Active Sources Overview */}

                        </div>                    <Card className="p-6">

                    </Card>                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">

                </div>                            🌐 Active Sources

            )}                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Alerts tab */}                            {sources.filter(s => s.active).map((source) => (

            {activeTab === 'alerts' && (                                <div key={source.id} className="p-4 border rounded-lg">

                <div className="space-y-6">                                    <div className="flex items-center gap-2 mb-2">

                    <Card className="p-6">                                        <span className="text-lg">{getSourceTypeIcon(source.type)}</span>

                        <h3 className="text-lg font-semibold mb-4">All Alerts</h3>                                        <h4 className="font-medium text-gray-900">{source.name}</h4>

                        <div className="space-y-3">                                    </div>

                            {alerts.map((alert) => (                                    <p className="text-sm text-gray-600 mb-1">{source.region}</p>

                                <div                                    <p className="text-xs text-gray-500">

                                    key={alert.id}                                        Last scan: {source.lastScan.toLocaleDateString()}

                                    className={`p - 4 rounded - lg border ${                                    </p >

    alert.read ? 'bg-gray-50' : 'bg-white border-l-4 border-l-blue-500' < p className = "text-xs text-gray-500" >

                                    } `}                                        Next scan: {source.nextScan.toLocaleDateString()}

                                >                                    </p>

                                    <div className="flex items-start justify-between">                                </div>

                                        <div className="flex-1">                            ))}

                                            <div className="flex items-center gap-2 mb-1">                        </div>

                                                <span className={`px - 2 py - 1 rounded text - xs font - semibold ${ getSeverityColor(alert.severity) } `}>                    </Card>

                                                    {alert.severity.toUpperCase()}                </div>

                                                </span>            )}

                                                <span className="text-sm text-gray-500">

                                                    {alert.createdAt.toLocaleString()}            {activeTab === 'sources' && (

                                                </span>                <div className="space-y-6">

                                            </div>                    <div className="flex justify-end">

                                            <p className="text-sm font-medium text-gray-900">                        <Button onClick={() => setShowAddSourceModal(true)}>

                                                {alert.message}                            ➕ Add Source

                                            </p>                        </Button>

                                            {alert.recommendedAction && (                    </div>

                                                <p className="text-xs text-blue-600 mt-1">

                                                    💡 {alert.recommendedAction}                    <Card className="p-6">

                                                </p>                        <h3 className="text-lg font-semibold mb-4">Tender Sources</h3>

                                            )}                        <div className="space-y-4">

                                        </div>                            {sources.map((source) => (

                                        <div className="flex items-center gap-2 ml-4">                                <div key={source.id} className="p-4 border rounded-lg">

                                            <span className="text-xs text-gray-500">                                    <div className="flex items-center justify-between">

                                                {alert.relevanceScore}% match                                        <div className="flex items-center gap-3">

                                            </span>                                            <span className="text-xl">{getSourceTypeIcon(source.type)}</span>

                                            <Button                                            <div>

                                                size="sm"                                                <h4 className="font-medium text-gray-900">{source.name}</h4>

                                                variant="ghost"                                                <p className="text-sm text-gray-600">{source.url}</p>

                                                onClick={() => handleMarkAlertRead(alert.id)}                                                <p className="text-xs text-gray-500">

                                                disabled={alert.read}                                                    {source.type} • {source.region}

                                            />                                                </p>

                                            <Button                                            </div>

                                                size="sm"                                        </div>

                                                variant="danger"                                        <div className="flex items-center gap-2">

                                                onClick={() => handleDeleteAlert(alert.id)}                                            <Badge className={source.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>

                                            >                                                {source.active ? 'Active' : 'Inactive'}

                                                Delete                                            </Badge>

                                            </Button>                                            <Button

                                        </div>                                                size="sm"

                                    </div>                                                variant={source.active ? 'danger' : 'success'}

                                </div>                                                onClick={() => handleToggleSource(source.id, !source.active)}

                            ))}                                            >

                            {alerts.length === 0 && (                                                {source.active ? 'Disable' : 'Enable'}

                                <p className="text-gray-500 text-center py-8">                                            </Button>

                                    No alerts yet. Start monitoring to receive notifications.                                            <Button

                                </p>                                                size="sm"

                            )}                                                variant="danger"

                        </div>                                                onClick={() => handleRemoveSource(source.id)}

                    </Card>                                            >

                </div>                                                Remove

            )}                                            </Button>

                                        </div>

            {/* Filters tab */}                                    </div>

            {activeTab === 'filters' && (                                </div>

                <div className="space-y-6">                            ))}

                    <Card className="p-6">                        </div>

                        <h3 className="text-lg font-semibold mb-4">Relevance Filters</h3>                    </Card>

                        <div className="space-y-4">                </div>

                            {filters.map((filter, index) => (            )}

                                <div key={index} className="p-4 border rounded-lg">

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">            {activeTab === 'alerts' && (

                                        <div>                <div className="space-y-6">

                                            <p className="text-sm font-medium text-gray-700">Keywords:</p>                    <Card className="p-6">

                                            <p className="text-sm text-gray-600">{filter.keywords.join(', ')}</p>                        <h3 className="text-lg font-semibold mb-4">All Alerts</h3>

                                        </div>                        <div className="space-y-3">

                                        <div>                            {alerts.map((alert) => (

                                            <p className="text-sm font-medium text-gray-700">Value Range:</p>                                <div

                                            <p className="text-sm text-gray-600">                                    key={alert.id}

                                                ${filter.minValue.toLocaleString()} - ${filter.maxValue.toLocaleString()}                                    className={`p - 4 rounded - lg border ${
    alert.read ? 'bg-gray-50' : 'bg-white border-l-4 border-l-blue-500'

                                            </p >                                        } `}

                                        </div>                                >

                                        <div>                                    <div className="flex items-start justify-between">

                                            <p className="text-sm font-medium text-gray-700">Regions:</p>                                        <div className="flex-1">

                                            <p className="text-sm text-gray-600">                                            <div className="flex items-center gap-2 mb-1">

                                                {filter.regions.length ? filter.regions.join(', ') : 'Any'}                                                <Badge className={getSeverityColor(alert.severity)}>

                                            </p>                                                    {alert.severity.toUpperCase()}

                                        </div>                                                </Badge>

                                        <div>                                                <span className="text-sm text-gray-500">

                                            <p className="text-sm font-medium text-gray-700">Sectors:</p>                                                    {alert.createdAt.toLocaleString()}

                                            <p className="text-sm text-gray-600">                                                </span>

                                                {filter.sectors.length ? filter.sectors.join(', ') : 'Any'}                                            </div>

                                            </p>                                            <p className="text-sm font-medium text-gray-900">

                                        </div>                                                {alert.message}

                                    </div>                                            </p>

                                </div>                                            {alert.recommendedAction && (

                            ))}                                                <p className="text-xs text-blue-600 mt-1">

                            {filters.length === 0 && (                                                    💡 {alert.recommendedAction}

                                <p className="text-gray-500 text-center py-8">                                                </p>

                                    No filters configured. Add filters to improve relevance scoring.                                            )}

                                </p>                                        </div>

                            )}                                        <div className="flex items-center gap-2 ml-4">

                        </div>                                            <span className="text-xs text-gray-500">

                    </Card>                                                {alert.relevanceScore}% match

                </div>                                            </span>

            )}                                            <Button

        </div>                                                size="sm"

    );                                                variant="ghost"

};                                                onClick={() => handleMarkAlertRead(alert.id)}
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