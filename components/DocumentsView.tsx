import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Document, Project, Permission, DocumentCategory, DocumentStatus, DocumentFolder, DocumentVersion } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { DocumentStatusBadge } from './ui/StatusBadge';
import { hasPermission } from '../services/auth';
import { Avatar } from './ui/Avatar';

// --- DocumentIcon Sub-Component ---
const DocumentIcon: React.FC<{ category: DocumentCategory }> = ({ category }) => {
    const icons = {
        [DocumentCategory.PLANS]: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m-6 3l6-3m0 0l6 3m-6-3v10" /></svg>,
        [DocumentCategory.PERMITS]: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
        [DocumentCategory.INVOICES]: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        [DocumentCategory.REPORTS]: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
        [DocumentCategory.PHOTOS]: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    };
    return icons[category] || icons[DocumentCategory.REPORTS];
};

const FolderIcon: React.FC<{}> = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
);

interface DocumentsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline: boolean;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ user, addToast, isOnline }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    
    const [folders, setFolders] = useState<DocumentFolder[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: number | null, name: string }[]>([]);

    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    
    const canManage = hasPermission(user, Permission.MANAGE_DOCUMENTS);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;
            const userProjects = hasPermission(user, Permission.VIEW_ALL_PROJECTS)
                ? await api.getProjectsByCompany(user.companyId)
                : await api.getProjectsByUser(user.id);
            setProjects(userProjects);
            if (userProjects.length > 0) {
                setCurrentProject(userProjects[0]);
            }
        } catch (error) {
            addToast("Failed to load projects.", "error");
        } finally {
            setLoading(false);
        }
    }, [user, addToast]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const fetchFolderContents = useCallback(async (projectId: number, folderId: number | null) => {
        setLoading(true);
        try {
            let contents;
            if (folderId === null) {
                const rootDocs = await api.getDocumentsByProjectIds([projectId]);
                const rootFolders = await api.getFoldersByProject(projectId).then(f => f.filter(folder => folder.parentId === null));
                contents = { documents: rootDocs, folders: rootFolders };
            } else {
                contents = await api.getFolderContents(folderId);
            }
            setDocuments(contents.documents);
            setFolders(contents.folders);

            // Update breadcrumbs
            if (folderId === null) {
                setBreadcrumbs([]);
            } else {
                const folder = await api.getFoldersByProject(projectId).then(all => all.find(f => f.id === folderId));
                if (folder) {
                    // This is a simplified breadcrumb logic. A real app would trace back parentIds.
                    const newBreadcrumbs = [...breadcrumbs];
                    const existingIndex = newBreadcrumbs.findIndex(b => b.id === folderId);
                    if (existingIndex > -1) {
                        newBreadcrumbs.splice(existingIndex + 1);
                    } else {
                        newBreadcrumbs.push({ id: folder.id, name: folder.name });
                    }
                    setBreadcrumbs(newBreadcrumbs);
                }
            }
        } catch (error) {
            addToast("Failed to load folder contents.", "error");
        } finally {
            setLoading(false);
        }
    }, [addToast, breadcrumbs]);
    
    useEffect(() => {
        if (currentProject) {
            fetchFolderContents(currentProject.id, currentFolderId);
        }
    }, [currentProject, currentFolderId, fetchFolderContents]);
    
    const handleProjectChange = (projectId: string) => {
        const project = projects.find(p => p.id.toString() === projectId);
        if (project) {
            setCurrentProject(project);
            setCurrentFolderId(null);
            setBreadcrumbs([]);
        }
    };

    const handleFolderClick = (folderId: number) => {
        setCurrentFolderId(folderId);
    };

    const handleBreadcrumbClick = (folderId: number | null, index: number) => {
        setCurrentFolderId(folderId);
        setBreadcrumbs(prev => prev.slice(0, index + 1));
    };

    if (!currentProject && !loading) {
        return <Card>Please select a project or be assigned to one to view documents.</Card>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold text-slate-800">Documents</h2>
                    <select
                        value={currentProject?.id || ''}
                        onChange={e => handleProjectChange(e.target.value)}
                        className="p-2 border rounded-md bg-white"
                    >
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                {canManage && <div className="flex gap-2">
                    <Button variant="secondary">New Folder</Button>
                    <Button onClick={() => setIsUploadModalOpen(true)} disabled={!isOnline}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Upload
                    </Button>
                </div>}
            </div>
            
            <Card>
                <div className="mb-4 text-sm text-slate-500">
                     <button onClick={() => handleBreadcrumbClick(null, -1)} className="hover:underline">{currentProject?.name}</button>
                     {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={crumb.id}>
                            <span className="mx-2">/</span>
                            <button onClick={() => handleBreadcrumbClick(crumb.id, index)} className="hover:underline">{crumb.name}</button>
                        </React.Fragment>
                     ))}
                </div>
                {loading ? <p>Loading...</p> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {folders.map(folder => (
                            <div key={folder.id} onDoubleClick={() => handleFolderClick(folder.id)} className="p-4 flex items-center gap-4 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border">
                                <FolderIcon />
                                <span className="font-semibold truncate">{folder.name}</span>
                            </div>
                        ))}
                        {documents.map(doc => (
                            <Card key={doc.id} className="p-4 flex flex-col justify-between animate-card-enter cursor-pointer hover:shadow-lg hover:border-sky-500/50">
                               <div>
                                    <div className="flex items-start gap-4 mb-3">
                                        <DocumentIcon category={doc.category} />
                                        <div className="flex-grow overflow-hidden">
                                            <h3 className="font-semibold truncate text-slate-800" title={doc.name}>{doc.name}</h3>
                                            <p className="text-xs text-slate-500">v{doc.latestVersionNumber}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400">Updated: {new Date(doc.updatedAt).toLocaleDateString()}</p>
                               </div>
                               <div className="mt-4 pt-3 border-t flex justify-between items-center">
                                   <DocumentStatusBadge status={doc.status} />
                                   <button className="text-xs font-semibold text-slate-500 hover:text-slate-800">...</button>
                               </div>
                            </Card>
                        ))}
                    </div>
                )}
                 {!loading && folders.length === 0 && documents.length === 0 && (
                    <div className="text-center py-16 text-slate-500">
                        <h3 className="text-xl font-semibold">Empty Folder</h3>
                        <p>This folder has no documents or sub-folders.</p>
                    </div>
                 )}
            </Card>
        </div>
    );
};