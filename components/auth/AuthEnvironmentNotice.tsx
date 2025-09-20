import React from 'react';
import { getAuthConnectionInfo } from '../../services/authClient';

interface AuthEnvironmentNoticeProps {
    align?: 'left' | 'center';
    className?: string;
}

const formatMessage = () => {
    const info = getAuthConnectionInfo();
    if (info.mode === 'backend') {
        const host = info.baseHost || info.baseUrl || 'configured backend';
        const fallbackNote = info.allowMockFallback
            ? ' If the service cannot be reached we will seamlessly fall back to the local demo store.'
            : '';
        return `Authenticated against ${host}.${fallbackNote}`;
    }
    return 'Operating in secure offline demo mode. Accounts are stored locally in your browser.';
};

export const AuthEnvironmentNotice: React.FC<AuthEnvironmentNoticeProps> = ({ align = 'center', className = '' }) => {
    const message = React.useMemo(() => formatMessage(), []);
    const alignmentClass = align === 'left' ? 'text-left' : 'text-center';
    return (
        <p className={`text-xs text-muted-foreground ${alignmentClass} ${className}`.trim()}>{message}</p>
    );
};

