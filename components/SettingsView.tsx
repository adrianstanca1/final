import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, Role, CompanySettings, Permission, LocalizationPreferences } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ToggleSwitch } from './ui/ToggleSwitch';
import { hasPermission } from '../services/auth';
import { Avatar } from './ui/Avatar';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'appearance' | 'company';

interface SettingsViewProps {
  user: User;
  onUserUpdate: (updatedUser: User) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
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

const SecuritySettings: React.FC<{ user: User; onUserUpdate: (u: User) => void; addToast: (m: string, t: 'success'|'error')=>void; }> = ({ user, onUserUpdate, addToast }) => {
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [isSavingPassword, setIsSavingPassword] = useState(false);

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

    return (
        <Card>
            <h3 className="text-xl font-bold text-slate-800 mb-6">Security</h3>
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
                    <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                        <div>
                            <p className="font-medium">Enable 2FA</p>
                            <p className="text-xs text-slate-500">Add an extra layer of security to your account.</p>
                        </div>
                        <ToggleSwitch checked={user.twoFactorEnabled || false} onChange={handle2FAToggle} />
                    </div>
                     {user.twoFactorEnabled && (
                        <div>
                            <p className="text-sm">Recovery Codes:</p>
                            <div className="p-3 bg-slate-100 rounded-md font-mono text-sm grid grid-cols-2 gap-2 mt-2">
                                <span>abcd-1234</span>
                                <span>efgh-5678</span>
                                <span>ijkl-9012</span>
                                <span>mnop-3456</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onUserUpdate, addToast, theme, setTheme }) => {
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
        
        const newSettings = { ...settings, ...updates };
        if(updates.localization) newSettings.localization = { ...settings.localization, ...updates.localization };
        
        setSettings(newSettings); // Optimistic update
        try {
            await api.updateCompanySettings(user.companyId, newSettings, user.id);
            addToast("Company settings updated.", "success");
        } catch(e) {
            setSettings(settings); // Revert on error
            addToast("Failed to update company settings.", "error");
        }
    };

    const tabs = useMemo(() => [
        { id: 'profile', label: 'Profile', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>, visible: true },
        { id: 'security', label: 'Security', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5.002 12.053 12.053 0 001 8c0 5.42 3.582 9.925 8 11.536A9.925 9.925 0 0019 8a12.053 12.053 0 00-1.166-2.998A11.954 11.954 0 0110 1.944zM10 6a1 1 0 011 1v3l-2 2a1 1 0 01-1.414-1.414L9 9.414V7a1 1 0 011-1z" clipRule="evenodd" /></svg>, visible: true },
        { id: 'notifications', label: 'Notifications', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>, visible: true },
        { id: 'appearance', label: 'Appearance', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>, visible: true },
        { id: 'company', label: 'Company', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 2l7.997 3.884A2 2 0 0119 7.616V16a2 2 0 01-2 2H3a2 2 0 01-2-2V7.616a2 2 0 011.003-1.732zM10 4l-6 2.91V16h12V6.91L10 4z" /></svg>, visible: canManageCompany },
    ].filter(t => t.visible), [canManageCompany]);

    const renderActiveTab = () => {
        if(isLoading || !settings) return <Card>Loading...</Card>;

        switch(activeTab) {
            case 'profile': return <ProfileSettings user={user} onUserUpdate={onUserUpdate} addToast={addToast} />;
            case 'security': return <SecuritySettings user={user} onUserUpdate={onUserUpdate} addToast={addToast} />;
            case 'appearance':
                return (
                    <Card>
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Appearance</h3>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                            <p className="font-medium">Theme</p>
                            <div className="flex items-center gap-2 p-1 bg-slate-200 rounded-lg">
                                <button onClick={() => setTheme('light')} className={`px-3 py-1 text-sm font-semibold rounded-md ${theme === 'light' ? 'bg-white shadow-sm' : ''}`}>Light</button>
                                <button onClick={() => setTheme('dark')} className={`px-3 py-1 text-sm font-semibold rounded-md ${theme === 'dark' ? 'bg-white shadow-sm' : ''}`}>Dark</button>
                            </div>
                        </div>
                    </Card>
                );
            case 'company':
                const loc = settings.localization;
                return(
                    <Card>
                        <h3 className="text-xl font-bold text-slate-800 mb-6">Company Settings</h3>
                        <div className="space-y-4">
                            <h4 className="font-semibold">Localization</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <select value={loc.timezone} onChange={e => handleCompanySettingsUpdate({ localization: { ...loc, timezone: e.target.value } })} className="p-2 border rounded-md bg-white">
                                    <option>Europe/London</option><option>America/New_York</option><option>Asia/Tokyo</option>
                                </select>
                                <select value={loc.language} onChange={e => handleCompanySettingsUpdate({ localization: { ...loc, language: e.target.value as LocalizationPreferences['language'] } })} className="p-2 border rounded-md bg-white">
                                    <option value="en-GB">English (UK)</option><option value="en-US">English (US)</option><option value="es-ES">Español</option>
                                </select>
                                <select value={loc.dateFormat} onChange={e => handleCompanySettingsUpdate({ localization: { ...loc, dateFormat: e.target.value as LocalizationPreferences['dateFormat'] } })} className="p-2 border rounded-md bg-white">
                                    <option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                </select>
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
