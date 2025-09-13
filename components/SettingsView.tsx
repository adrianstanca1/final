// full contents of components/SettingsView.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { User, CompanySettings } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ToggleSwitch } from './ui/ToggleSwitch';
import { getFailedSyncActions, retryFailedAction, discardFailedAction, formatFailedActionForUI, FailedActionForUI } from '../services/mockApi';

interface SettingsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  settings: CompanySettings | null;
  onSettingsUpdate: (updatedSettings: Partial<CompanySettings>) => void;
}

const FailedSyncActions: React.FC<{ addToast: (m:string,t:'success'|'error')=>void }> = ({ addToast }) => {
    const [failedActions, setFailedActions] = useState<FailedActionForUI[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadFailedActions = useCallback(() => {
        const actions = getFailedSyncActions().map(formatFailedActionForUI);
        setFailedActions(actions);
    }, []);
    
    useEffect(() => {
        loadFailedActions();
        // Poll for changes, as they can happen in the background
        const interval = setInterval(loadFailedActions, 5000);
        return () => clearInterval(interval);
    }, [loadFailedActions]);

    const handleRetry = async (id: number) => {
        setIsLoading(true);
        try {
            await retryFailedAction(id);
            addToast("Retrying action...", "success");
            // The sync process will run, and we'll get a toast from useOfflineSync
        } catch (error) {
             addToast("Retry failed immediately.", "error");
        }
        loadFailedActions(); // Refresh the list
        setIsLoading(false);
    };
    
    const handleDiscard = (id: number) => {
        discardFailedAction(id);
        addToast("Action discarded.", "success");
        loadFailedActions();
    };

    if (failedActions.length === 0) {
        return null;
    }

    return (
        <Card>
            <h3 className="font-bold text-lg text-red-600">Offline Sync Issues</h3>
            <p className="text-sm text-slate-500 mb-4">The following actions failed to sync with the server. You can retry them or discard them if they are no longer needed.</p>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {failedActions.map(action => (
                    <div key={action.id} className="p-3 border rounded-md bg-red-50 dark:bg-red-900/20">
                        <p className="font-semibold break-all text-sm">{action.summary}</p>
                        <p className="text-sm text-red-700 dark:text-red-300">Error: {action.error}</p>
                        <p className="text-xs text-slate-400">Failed at: {action.timestamp}</p>
                        <div className="flex justify-end gap-2 mt-2">
                            <Button size="sm" variant="secondary" onClick={() => handleDiscard(action.id)} disabled={isLoading}>Discard</Button>
                            <Button size="sm" variant="primary" onClick={() => handleRetry(action.id)} isLoading={isLoading}>Retry</Button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};


export const SettingsView: React.FC<SettingsViewProps> = ({ user, addToast, settings, onSettingsUpdate }) => {
    
    const handleSettingsChange = (key: keyof CompanySettings, value: any) => {
        if (settings && settings[key] !== value) {
            onSettingsUpdate({ [key]: value });
        }
    };
    
    const handleAccessibilityChange = (key: keyof CompanySettings['accessibility'], value: any) => {
        if (settings && settings.accessibility && settings.accessibility[key] !== value) {
             onSettingsUpdate({
                accessibility: { ...settings.accessibility, [key]: value }
            });
        }
    };

    if (!settings) {
        return <Card><p>Loading settings...</p></Card>;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Settings</h2>
            
            <FailedSyncActions addToast={addToast} />

            <Card>
                <h3 className="font-bold text-lg">Appearance</h3>
                <div className="mt-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <label htmlFor="theme">Theme</label>
                        <select
                            id="theme"
                            value={settings.theme}
                            onChange={(e) => handleSettingsChange('theme', e.target.value as 'light' | 'dark')}
                            className="p-2 border rounded bg-white dark:bg-slate-700"
                        >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </div>
                </div>
            </Card>

            <Card>
                 <h3 className="font-bold text-lg">Accessibility</h3>
                 <div className="mt-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <label>
                            <p>High Contrast Mode</p>
                            <p className="text-sm text-slate-500">Increases text and UI element contrast.</p>
                        </label>
                        <ToggleSwitch 
                            checked={settings.accessibility.highContrast} 
                            onChange={(checked) => handleAccessibilityChange('highContrast', checked)}
                        />
                    </div>
                 </div>
            </Card>
        </div>
    );
};