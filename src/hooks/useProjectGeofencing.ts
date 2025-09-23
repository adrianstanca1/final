import { useEffect, useMemo, useRef } from 'react';
import { Project, User } from '../types';
import { useGeolocation } from './useGeolocation';
import { notificationService } from '../services/notificationService';

const meters = (n: number | undefined) => (typeof n === 'number' && isFinite(n) ? n : 0);

export function useProjectGeofencing(user: User, projects: Project[], enabled: boolean) {
  const geofences = useMemo(() => {
    return projects
      .filter(p => p.location && typeof p.location.lat === 'number' && typeof p.location.lng === 'number' && meters(p.geofenceRadius) > 0)
      .map(p => ({ id: p.id, lat: p.location.lat, lng: p.location.lng, radius: meters(p.geofenceRadius) }));
  }, [projects]);

  const { watchLocation, stopWatching, insideGeofenceIds } = useGeolocation({ geofences });
  const prevInsideRef = useRef<Set<string | number>>(new Set());

  useEffect(() => {
    if (!enabled || geofences.length === 0) return;
    watchLocation();
    return () => stopWatching();
  }, [enabled, geofences.length, watchLocation, stopWatching]);

  useEffect(() => {
    if (!enabled) return;
    const prev = prevInsideRef.current;
    geofences.forEach(f => {
      const wasInside = prev.has(f.id);
      const isInside = insideGeofenceIds.has(f.id);
      if (!wasInside && isInside) {
        notificationService.sendNotification({
          title: 'Site entry detected',
          message: `You have entered the site for project ${projects.find(p => p.id === f.id)?.name || f.id}.`,
          userId: user.id,
          metadata: { view: 'project-detail', projectId: String(f.id), priority: 'high' },
        });
      }
    });
    prevInsideRef.current = new Set(insideGeofenceIds);
  }, [insideGeofenceIds, geofences, enabled, user.id, projects]);
}
