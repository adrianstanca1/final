import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, Role, CompanySettings, Permission, LocalizationPreferences, AuditLog } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ToggleSwitch } from './ui/ToggleSwitch';
import { hasPermission } from '../services/auth';
import { Avatar } from './ui/Avatar';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'preferences' | 'company' | 'developer';

interface SettingsViewProps {
  user: User;
  onUserUpdate: (updatedUser: User) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  onSettingsUpdate: (companyId: number) => void;
}

const TabButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            isActive
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const ProfileSettings: React.FC<{ user: User; onUserUpdate: (u: User) => void; addToast: (m: string, t: 'success'|'error')=>void; }> = ({ user, onUserUpdate, addToast }) => {
    const [formData, setFormData] = useState({ name: user.name, email: user.email, phone: user.phone || '' });
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const updatedUser = await api.updateUserAvatar(user.id, file);
            onUserUpdate(updatedUser);
            addToast("Avatar updated successfully.", "success");
        } catch (error) {
            addToast("Failed to upload avatar.", "error");
        }
    };

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const updatedUser = await api.updateUserProfile(user.id, formData);
            onUserUpdate(updatedUser);
            addToast("Profile updated successfully.", "success");
        } catch(e) {
            addToast("Failed to update profile.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-bold text-slate-800 mb-6">Profile Settings</h3>
            <form onSubmit={handleSaveChanges} className="space-y-6">
                <div className="flex items-center gap-5">
                    <Avatar name={user.name} imageUrl={user.avatarUrl} className="w-24 h-24 text-4xl" />
                    <div>
                        <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>Upload new picture</Button>
                        <p className="text-xs text-slate-500 mt-2">Recommended: 200x200px, PNG or JPG</p>
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2 border rounded-md" />
                    </div>
                 </div>
                 <div className="text-right border-t pt-4">
                    <Button type="submit" isLoading={isSaving}>Save Changes</Button>
                 </div>
            </form>
        </Card>
    );
};

const downloadCsv = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            let cell = row[header];
            if (cell === null || cell === undefined) {
                return '';
            }
            if (typeof cell === 'object') {
                cell = JSON.stringify(cell).replace(/"/g, '""');
            }
            const strCell = String(cell);
            if (strCell.includes(',') || strCell.includes('"') || strCell.includes('\n')) {
                return `"${strCell.replace(/"/g, '""')}"`;
            }
            return strCell;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const SecuritySettings: React.FC<{ user: User; onUserUpdate: (u: User) => void; addToast: (m: string, t: 'success'|'error')=>void; }> = ({ user, onUserUpdate, addToast }) => {
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.new !== passwordData.confirm) {
            addToast("New passwords do not match.", "error");
            return;
        }
        setIsSavingPassword(true);
        try {
            await api.changePassword(user.id, passwordData.current, passwordData.new);
            addToast("Password changed successfully.", "success");
            setPasswordData({ current: '', new: '', confirm: '' });
        } catch(e) {
            addToast("Failed to change password.", "error");
        } finally {
            setIsSavingPassword(false);
        }
    };
    
    const handle2FAToggle = async (enabled: boolean) => {
        try {
            const updatedUser = await api.updateUserProfile(user.id, { twoFactorEnabled: enabled });
            onUserUpdate(updatedUser);
            addToast(`Two-factor authentication ${enabled ? 'enabled' : 'disabled'}.`, 'success');
        } catch(e) {
            addToast("Failed to update 2FA status.", "error");
        }
    };
    
    const handleDownloadData = async () => {
        setIsDownloading(true);
        try {
            const myLogs = await api.getAuditLogsByActorId(user.id);
            downloadCsv(myLogs, `my-activity-log-${new Date().toISOString().split('T')[0]}.csv`);
            addToast("Your activity data has been downloaded.", "success");
        } catch(e) {
            addToast("Failed to download your data.", "error");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-bold text-slate-800 mb-6">Security & Privacy</h3>
            <div className="space-y-8">
                {/* Password Change */}
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <h4 className="font-semibold">Change Password</h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="password" value={passwordData.current} onChange={e => setPasswordData({...passwordData, current: e.target.value})} placeholder="Current Password" className="w-full p-2 border rounded-md" />
                        <input type="password" value={passwordData.new} onChange={e => setPasswordData({...passwordData, new: e.target.value})} placeholder="New Password" className="w-full p-2 border rounded-md" />
                        <input type="password" value={passwordData.confirm} onChange={e => setPasswordData({...passwordData, confirm: e.target.value})} placeholder="Confirm New Password" className="w-full p-2 border rounded-md" />
                     </div>
                     <div className="text-right">
                        <Button type="submit" variant="secondary" isLoading={isSavingPassword}>Update Password</Button>
                     </div>
                </form>

                {/* Two-Factor Authentication */}
                <div className="border-t pt-6 space-y-4">
                    <h4 className="font-semibold">Two-Factor Authentication (2FA)</h4>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div>
                            <p className="font-medium">Enable 2FA</p>
                            <p className="text-xs text-slate-500">Add an extra layer of security to your account.</p>
                        </div>
                        <ToggleSwitch checked={user.twoFactorEnabled || false} onChange={handle2FAToggle} />
                    </div>
                     {user.twoFactorEnabled && (
                        <div>
                            <p className="text-sm">Recovery Codes:</p>
                            <div className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-md font-mono text-sm grid grid-cols-2 gap-2 mt-2">
                                <span>abcd-1234</span>
                                <span>efgh-5678</span>
                                <span>ijkl-9012</span>
                                <span>mnop-3456</span>
                            </div>
                        </div>
                    )}
                </div>
                
                 {/* Data Export */}
                <div className="border-t pt-6 space-y-4">
                    <h4 className="font-semibold">Privacy</h4>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div>
                            <p className="font-medium">Export Your Data</p>
                            <p className="text-xs text-slate-500">Download a copy of your activity log.</p>
                        </div>
                        <Button variant="secondary" onClick={handleDownloadData} isLoading={isDownloading}>Download My Data</Button>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onUserUpdate, addToast, onSettingsUpdate }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [settings, setSettings] = useState<CompanySettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const canManageCompany = hasPermission(user, Permission.MANAGE_TEAM);

    const fetchData = useCallback(async () => {
        if (!user.companyId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const settingsData = await api.getCompanySettings(user.companyId);
            setSettings(settingsData);
        } catch (error) {
            addToast("Failed to load settings.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleCompanySettingsUpdate = async (updates: Partial<CompanySettings>) => {
        if (!user.companyId || !settings) return;

        const newSettings = { ...settings };

        // FIX: The original code caused type errors because it didn't verify that the existing setting value (`settings[typedKey]`)
        // was an object before trying to spread it, and it could incorrectly assign `undefined` to a setting.
        // This updated logic ensures both the original and new values are objects before merging.
        // It also prevents `undefined` from being assigned, making the settings update safer.
        for (const key in updates) {
            if (Object.prototype.hasOwnProperty.call(updates, key)) {
                const typedKey = key as keyof CompanySettings;
                const updateValue = updates[typedKey];
                const originalValue = settings[typedKey];

                if (typeof updateValue === 'object' && updateValue !== null && !Array.isArray(updateValue) &&
                    typeof originalValue === 'object' && originalValue !== null && !Array.isArray(originalValue))
                {
                    // Both are objects, merge them. We use `as any` because TypeScript has trouble with indexed access assignment on complex union types.
                    (newSettings[typedKey] as any) = { ...originalValue, ...updateValue };
                } else if (updateValue !== undefined) {
                    // Primitive value assignment.
                    (newSettings as any)[typedKey] = updateValue;
                }
            }
        }

        setSettings(newSettings); // Optimistic update
        try {
            await api.updateCompanySettings(user.companyId, newSettings, user.id);
            addToast("Settings updated.", "success");
            onSettingsUpdate(user.companyId); // Tell parent to refetch
        } catch(e) {
            setSettings(settings); // Revert on error
            addToast("Failed to update settings.", "error");
        }
    };

    const tabs = useMemo(() => [
        { id: 'profile', label: 'Profile', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>, visible: true },
        { id: 'security', label: 'Security', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5.002 12.053 12.053 0 001 8c0 5.42 3.582 9.925 8 11.536A9.925 9.925 0 0019 8a12.053 12.053 0 00-1.166-2.998A11.954 11.954 0 0110 1.944zM10 6a1 1 0 011 1v3l-2 2a1 1 0 01-1.414-1.414L9 9.414V7a1 1 0 011-1z" clipRule="evenodd" /></svg>, visible: true },
        { id: 'preferences', label: 'Preferences', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>, visible: true },
        { id: 'company', label: 'Company', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 2l7.997 3.884A2 2 0 0119 7.616V16a2 2 0 01-2 2H3a2 2 0 01-2-2V7.616a2 2 0 011.003-1.732zM10 4l-6 2.91V16h12V6.91L10 4z" /></svg>, visible: canManageCompany },
        { id: 'developer', label: 'Developer', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>, visible: user.role === Role.ADMIN },
    ].filter(t => t.visible), [canManageCompany, user.role]);

    const renderActiveTab = () => {
        if(isLoading || !settings) return <Card>Loading...</Card>;

        switch(activeTab) {
            case 'profile': return <ProfileSettings user={user} onUserUpdate={onUserUpdate} addToast={addToast} />;
            case 'security': return <SecuritySettings user={user} onUserUpdate={onUserUpdate} addToast={addToast} />;
            case 'preferences':
                return (
                    <Card>
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Preferences</h3>
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold mb-2">Appearance</h4>
                                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                                    <p className="font-medium">Theme</p>
                                    <div className="flex items-center gap-2 p-1 bg-slate-200 dark:bg-slate-700 rounded-lg">
                                        <button onClick={() => handleCompanySettingsUpdate({ theme: 'light' })} className={`px-3 py-1 text-sm font-semibold rounded-md ${settings.theme === 'light' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'dark:text-slate-300'}`}>Light</button>
                                        <button onClick={() => handleCompanySettingsUpdate({ theme: 'dark' })} className={`px-3 py-1 text-sm font-semibold rounded-md ${settings.theme === 'dark' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'dark:text-slate-300'}`}>Dark</button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Accessibility</h4>
                                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                                    <div>
                                        <p className="font-medium">High Contrast Mode</p>
                                        <p className="text-xs text-slate-500">Increases text and UI contrast for better visibility.</p>
                                    </div>
                                    <ToggleSwitch checked={settings.accessibility.highContrast} onChange={checked => handleCompanySettingsUpdate({ accessibility: { highContrast: checked } })} />
                                </div>
                            </div>
                             <div>
                                <h4 className="font-semibold mb-2">Uploads</h4>
                                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                                    <div>
                                        <p className="font-medium">Auto-start uploads</p>
                                        <p className="text-xs text-slate-500">Begin uploading files immediately after selection.</p>
                                    </div>
                                    <ToggleSwitch checked={settings.uploadPreferences.autoStart} onChange={checked => handleCompanySettingsUpdate({ uploadPreferences: { autoStart: checked } })} />
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            case 'company':
                const loc = settings.localization;
                return(
                    <Card>
                        <h3 className="text-xl font-bold text-slate-800 mb-6">Company Settings</h3>
                        <div className="space-y-6">
                             <div>
                                <h4 className="font-semibold mb-2">Localization</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <select value={loc.timezone} onChange={e => handleCompanySettingsUpdate({ localization: { ...loc, timezone: e.target.value } })} className="p-2 border rounded-md bg-white dark:bg-slate-800 dark:border-slate-700">
                                        <option>Europe/London</option><option>America/New_York</option><option>Asia/Tokyo</option>
                                    </select>
                                    <select value={loc.language} onChange={e => handleCompanySettingsUpdate({ localization: { ...loc, language: e.target.value as LocalizationPreferences['language'] } })} className="p-2 border rounded-md bg-white dark:bg-slate-800 dark:border-slate-700">
                                        <option value="en-GB">English (UK)</option><option value="en-US">English (US)</option><option value="es-ES">Español</option>
                                    </select>
                                    <select value={loc.dateFormat} onChange={e => handleCompanySettingsUpdate({ localization: { ...loc, dateFormat: e.target.value as LocalizationPreferences['dateFormat'] } })} className="p-2 border rounded-md bg-white dark:bg-slate-800 dark:border-slate-700">
                                        <option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                    </select>
                                </div>
                            </div>
                             <div className="border-t pt-6">
                                <h4 className="font-semibold mb-2">Data Retention</h4>
                                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                                    <div>
                                        <p className="font-medium">Audit Log Retention</p>
                                        <p className="text-xs text-slate-500">Automatically delete audit logs older than the selected period.</p>
                                    </div>
                                    <select 
                                        value={settings.dataRetention.retentionPeriodDays} 
                                        onChange={e => handleCompanySettingsUpdate({ dataRetention: { retentionPeriodDays: parseInt(e.target.value, 10) as any } })} 
                                        className="p-2 border rounded-md bg-white dark:bg-slate-700 dark:border-slate-600"
                                    >
                                        <option value={90}>90 Days</option>
                                        <option value={180}>180 Days</option>
                                        <option value={365}>1 Year</option>
                                        <option value={-1}>Forever</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            case 'developer':
                return(
                     <Card>
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Developer Tools</h3>
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold mb-2">Accessibility</h4>
                                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                                    <div>
                                        <p className="font-medium">Enable Accessibility Audit Mode</p>
                                        <p className="text-xs text-slate-500">Overlays accessibility information on components for testing.</p>
                                    </div>
                                    <ToggleSwitch checked={settings.developer.accessibilityAudit} onChange={checked => handleCompanySettingsUpdate({ developer: { accessibilityAudit: checked } })} />
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            default: return null;
        }
    };
    
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-800">Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                <div className="md:col-span-1">
                    <Card className="p-2">
                        <div className="space-y-1">
                            {tabs.map(tab => (
                                <TabButton
                                    key={tab.id}
                                    label={tab.label}
                                    icon={tab.icon}
                                    isActive={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                                />
                            ))}
                        </div>
                    </Card>
                </div>
                <div className="md:col-span-3">
                    {renderActiveTab()}
                </div>
            </div>
        </div>
    );
};