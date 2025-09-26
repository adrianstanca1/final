import React from 'react';
import { User, View } from '../types';
import { Card } from './ui/Card';

interface SafetyViewProps {
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
    setActiveView: (view: View) => void;
}

export const SafetyView: React.FC<SafetyViewProps> = ({ user, addToast, setActiveView }) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-foreground">Safety Management</h1>
            </div>

            <Card>
                <div className="p-6 text-center">
                    <h3 className="text-lg font-medium text-foreground mb-2">Safety Module</h3>
                    <p className="text-muted-foreground">
                        Safety management features are being updated and will be available soon.
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default SafetyView;