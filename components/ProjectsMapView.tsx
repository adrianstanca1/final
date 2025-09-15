import React, { useState, useEffect, useMemo, useCallback } from 'react';
// FIX: Corrected import paths to be relative.
import { User, Project, Permission, ProjectStatus } from '../types';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { Card } from './ui/Card';
// FIX: Corrected the import from './MapView' to use the exported 'MapMarkerData' interface.
import { MapView, MapMarkerData } from './MapView';

interface ProjectsMapViewProps {
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
}

export const ProjectsMapView: React.FC<ProjectsMapViewProps> = ({ user, addToast }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (!user.companyId) return;

                let projectsPromise: Promise<Project[]>;
                if (hasPermission(user, Permission.VIEW_ALL_PROJECTS)) {
                    projectsPromise = api.getProjectsByCompany(user.companyId);
                } else {
                    projectsPromise = api.getProjectsByUser(user.id);
                }
                
                const fetchedProjects = await projectsPromise;
                setProjects(fetchedProjects);
            } catch (error) {
                addToast("Failed to load project locations.", 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, addToast]);

    const markers: MapMarkerData[] = useMemo(() => {
        const toPascalCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        return projects
            .filter(p => p.location && p.location.lat && p.location.lng)
            .map(p => ({
                id: p.id,
                lat: p.location.lat,
                lng: p.location.lng,
                radius: p.geofenceRadius,
                // FIX: Convert project status to PascalCase for the map marker type.
                status: toPascalCase(p.status) as MapMarkerData['status'],
                popupContent: (
                    <div>
                        <h4 className="font-bold">{p.name}</h4>
                        <p>Status: {p.status}</p>
                    </div>
                ),
            }));
    }, [projects]);
    
    if (loading) {
        return <Card><p>Loading map and project locations...</p></Card>;
    }

    return (
        // Use negative margins to counteract parent padding and h-screen for full height
        <Card className="h-screen p-0 overflow-hidden -m-6 lg:-m-8">
            <MapView markers={markers} height="100%" />
        </Card>
    );
};