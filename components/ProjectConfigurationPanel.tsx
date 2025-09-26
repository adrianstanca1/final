import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { multiProjectManager } from '../services/multiProjectManager';
import { useMultiProject } from '../hooks/useMultiProject';

export const ProjectConfigurationPanel: React.FC = () => {
    const { availableProjects, currentProject } = useMultiProject();
    const [showConfig, setShowConfig] = useState(false);
    const [secondaryUrl, setSecondaryUrl] = useState('');

    const unconfiguredProjects = availableProjects.filter(p => !p.configured);

    if (unconfiguredProjects.length === 0) {
        return null;
    }

    const handleSaveSecondaryUrl = () => {
        if (secondaryUrl.trim()) {
            // This would normally save to environment or config
            // For now, we'll show instructions
            alert(`To complete setup, add this to your .env.local:\n\nVITE_SUPABASE_URL_SECONDARY=${secondaryUrl.trim()}`);
            setShowConfig(false);
            setSecondaryUrl('');
        }
    };

    return (
        <div className="space-y-4">
            {unconfiguredProjects.map(({ key, config }) => (
                <Card key={key} className="p-4 border-yellow-200 bg-yellow-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-gray-900">
                                {config.name} - Configuration Required
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                This project is not fully configured. Add the missing environment variables to enable it.
                            </p>
                            <div className="mt-2 text-xs text-gray-500">
                                <div>✅ Anonymous Key: Configured</div>
                                <div>✅ Service Role Key: Configured</div>
                                <div className="text-red-600">❌ Project URL: Missing VITE_SUPABASE_URL_SECONDARY</div>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowConfig(!showConfig)}
                        >
                            Configure
                        </Button>
                    </div>

                    {showConfig && (
                        <div className="mt-4 pt-4 border-t border-yellow-300">
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Secondary Supabase Project URL
                                    </label>
                                    <input
                                        type="url"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        placeholder="https://your-project-id.supabase.co"
                                        value={secondaryUrl}
                                        onChange={(e) => setSecondaryUrl(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleSaveSecondaryUrl}>
                                        Save Configuration
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setShowConfig(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            ))}
        </div>
    );
};