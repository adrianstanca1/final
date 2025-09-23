import React from 'react';
import { useBackendConnection } from '../hooks/useBackendConnection';

export const BackendStatus: React.FC = () => {
  const state = useBackendConnection();
  const color = !state.online ? 'bg-red-100 text-red-700' : state.mode === 'backend' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
  const label = !state.online ? 'Offline' : state.mode === 'backend' ? `Backend: ${state.baseUrl ? new URL(state.baseUrl).host : 'configured'}` : 'Mock Mode';

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${color}`} title={`Last sync: ${state.lastSync ?? '—'}`}>
      <span className={`h-2 w-2 rounded-full ${!state.online ? 'bg-red-500' : state.mode === 'backend' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      <span>{label}</span>
    </div>
  );
};
