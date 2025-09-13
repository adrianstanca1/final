import React, { useState, useEffect } from 'react';
// FIX: Corrected import paths to be relative.
import { User, CompanySettings, Role } from '../types';
import { api, getFailedSyncActions, retryFailedAction, discardFailedAction, formatFailedActionForUI } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ToggleSwitch } from './ui/ToggleSwitch';
import { Avatar } from './ui/Avatar';

interface SettingsViewProps {
  user: User;
  settings: CompanySettings | null;
  onUserUpdate: (user: User) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  onSettingsUpdate: (settings: CompanySettings) => void;
}

const FailedSyncActions: React.FC<{ addToast: (m:string, t:'success'|'error')=>void }> = ({ addToast }) => {
    const [failedActions, setFailedActions] = useState(getFailedSyncActions().map(formatFailedActionForUI));
    
    const handleRetry = async (id: number) => {
        const success = await retryFailedAction(id);
        if (success) {
            addToast("Action has been re-queued for syncing.", "success");
            setFailedActions(getFailedSyncActions().map(formatFailedActionForUI));
        } else {
            addToast("Failed to re-queue action.", "error");
        }
    };
    
    const handleDiscard = (id: number) => {
        const success = discardFailedAction(id);
        if (success) {
            addToast("Action discarded.", "success");
            setFailedActions(getFailedSyncActions().map(formatFailedActionForUI));
        }
    };
    
    if (failedActions.length === 0) {
        return <p className="text-sm text-slate-500">No failed sync actions.</p>;
    }
    
    return (
        <div className="space-y-3">
            {failedActions.map(action => (
                <div key={action.id} className="p-3 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-red-800">{action.actionType}</p>
                        <p className="text-sm text-red-600">Failed at: {action.timestamp}</p>
                        <p className="text-xs text-slate-500" title={JSON.stringify(action.payload, null, 2)}>Entity: {action.entitySummary}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => handleDiscard(action.id)}>Discard</Button>
                        <Button size="sm" onClick={() => handleRetry(action.id)}>Retry</Button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const SettingsView: React.FC<SettingsViewProps> = ({ user, settings, onUserUpdate, addToast, onSettingsUpdate }) => {
    const [localUser, setLocalUser] = useState<User>(user);
    const [localSettings, setLocalSettings] = useState<CompanySettings | null>(settings);
    
    useEffect(() => {
        setLocalUser(user);
        setLocalSettings(settings);
    }, [user, settings]);

    const handleUserChange = (field: keyof User, value: any) => {
        setLocalUser(prev => ({ ...prev, [field]: value }));
    };

    const handleSettingsChange = (category: keyof CompanySettings, field: string, value: any) => {
       setLocalSettings(prev => {
           if (!prev) return null;
           // FIX: This logic for updating nested settings properties is safer and prevents runtime errors. It ensures that both the original and updated values are objects before attempting to merge them, which is a common source of bugs in React state management.
           const newSettings = { ...prev };
           const categoryState = newSettings[category];
            if (typeof categoryState === 'object' && categoryState !== null) {
                (newSettings as any)[category] = {
                    ...categoryState,
                    [field]: value,
                };
            }
            return newSettings;
       });
    };
    
    const handleThemeChange = (theme: 'light' | 'dark') => {
        setLocalSettings(prev => prev ? ({ ...prev, theme }) : null);
    };

    const handleSave = async () => {
        try {
            const updatedUser = await api.updateUserProfile(localUser.id, localUser, user.id);
            onUserUpdate(updatedUser);

            if (localSettings && user.companyId) {
                const updatedSettings = await api.updateCompanySettings(localSettings, user.id);
                onSettingsUpdate(updatedSettings);
            }
            
            addToast("Settings saved successfully!", "success");
        } catch (error) {
            addToast("Failed to save settings.", "error");
        }
    };
    
    if (!localSettings) {
        return <Card>Loading settings...</Card>;
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
             <div>
                <h2 className="text-3xl font-bold text-slate-800">Settings</h2>
                <p className="text-slate-500">Manage your profile, preferences, and company settings.</p>
            </div>
            
             <Card>
                <h3 className="text-xl font-semibold mb-4 border-b pb-2">My Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input type="text" value={localUser.name} onChange={e => handleUserChange('name', e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" value={localUser.email} onChange={e => handleUserChange('email', e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input type="tel" value={localUser.phone || ''} onChange={e => handleUserChange('phone', e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                    <div className="flex items-center justify-between pt-6">
                        <span className="font-medium">Enable Two-Factor Authentication</span>
                        <ToggleSwitch checked={localUser.twoFactorEnabled || false} onChange={checked => handleUserChange('twoFactorEnabled', checked)} />
                    </div>
                </div>
            </Card>

            {user.role === Role.ADMIN && (
                <Card>
                    <h3 className="text-xl font-semibold mb-4 border-b pb-2">Company Settings</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Theme</span>
                            <div className="flex items-center gap-2">
                                <Button variant={localSettings.theme === 'light' ? 'primary' : 'secondary'} onClick={() => handleThemeChange('light')}>Light</Button>
                                <Button variant={localSettings.theme === 'dark' ? 'primary' : 'secondary'} onClick={() => handleThemeChange('dark')}>Dark</Button>
                            </div>
                        </div>
                         <div className="flex items-center justify-between">
                            <span className="font-medium">Auto-start uploads</span>
                            <ToggleSwitch checked={localSettings.uploadPreferences.autoStart} onChange={checked => handleSettingsChange('uploadPreferences', 'autoStart', checked)} />
                        </div>
                    </div>
                </Card>
            )}

            <Card>
                <h3 className="text-xl font-semibold mb-4 border-b pb-2">Offline Sync Issues</h3>
                 <FailedSyncActions addToast={addToast} />
            </Card>

            <div className="text-right">
                <Button onClick={handleSave}>Save Settings</Button>
            </div>
        </div>
    );
};