import { useEffect, useState } from 'react';
import { backendGateway } from '../services/backendGateway';
import { BackendConnectionState } from '../types';

export const useBackendConnection = (): BackendConnectionState => {
  const [state, setState] = useState<BackendConnectionState>(backendGateway.getState());

  useEffect(() => {
    return backendGateway.subscribe(setState);
  }, []);

  return state;
};

