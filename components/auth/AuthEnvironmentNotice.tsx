import React from 'react';

interface AuthEnvironmentNoticeProps {
    align?: 'left' | 'center';
    className?: string;
}



export const AuthEnvironmentNotice: React.FC<AuthEnvironmentNoticeProps> = ({ align = 'center', className = '' }) => {
    // Temporarily simplified to avoid infinite loop
    const alignmentClass = align === 'left' ? 'text-left' : 'text-center';
    return (
        <p className={`text-xs text-muted-foreground ${alignmentClass} ${className}`.trim()}>
            Operating in secure offline demo mode. Accounts are stored locally in your browser.
        </p>
    );
};

