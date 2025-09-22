import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface UserRegistrationProps {
  onSwitchToLogin: () => void;
}

export const UserRegistration: React.FC<UserRegistrationProps> = ({ onSwitchToLogin }) => {
    return (
        <div className="mx-auto max-w-2xl">
            <div className="space-y-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-8 w-8 text-primary" fill="currentColor">
                            <path d="M12 2 2 22h20L12 2Zm0 3.3L19.1 20H4.9L12 5.3Z" />
                        </svg>
                        <h1 className="text-2xl font-bold text-foreground">Create your AS Agents account</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">Join thousands of construction teams collaborating in one workspace.</p>
                </div>

                <Card>
                    <div className="p-6 space-y-4">
                        <h2 className="text-lg font-semibold">Registration Coming Soon</h2>
                        <p className="text-sm text-muted-foreground">
                            New user registration is being enhanced. Please contact support or use an existing account.
                        </p>
                        <div className="pt-4">
                            <Button type="button" onClick={onSwitchToLogin}>Back to login</Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default UserRegistration;