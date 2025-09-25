import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, Document, Project, Permission, CompanySettings } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';

interface DocumentsViewProps {
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
    isOnline?: boolean;
    settings?: CompanySettings | null;
}

const FileUploadModal: React.FC<{ project: Project; onClose: () => void; onSuccess: () => void; addToast: (m: string, t: 'success' | 'error') => void; user: User }> = ({ project, onClose, onSuccess, addToast, user }) => {
    const [file, setFile] = useState<File | null>(null);
    const [category, setCategory] = useState('General');
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async () => {
        if (!file) {
            addToast("Please select a file.", "error");
            return;
        }
        setIsUploading(true);
        try {
            await api.uploadDocument({
                name: file.name,
                projectId: project.id,
                category,
                // In a real app, you'd handle the file binary here
            }, user.id);
            addToast("Document uploaded successfully.", 'success');
            onSuccess();
            onClose();
        } catch (error) {
            addToast(error instanceof Error ? error.message : "Upload failed.", "error");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg mb-2">Upload to {project.name}</h3>
                <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} aria-label="Select file to upload" title="Select file to upload" />
                <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Category (e.g., Blueprints)" className="w-full p-2 border rounded mt-2" />
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleUpload} isLoading={isUploading}>Upload</Button>
                </div>
            </Card>
        </div>
    );
};

export const DocumentsView: React.FC<DocumentsViewProps> = ({ user, addToast, isOnline, settings }) => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const canUpload = hasPermission(user, Permission.UPLOAD_DOCUMENTS);

    useEffect(() => {
        const loadData = async () => {
            try {
                if (!user.companyId) throw new Error('Company ID not found');
                const [documentsResult, projectsResult] = await Promise.all([
                    api.getDocumentsByCompany(user.companyId),
                    api.getProjectsByCompany(user.companyId)
                ]);
                setDocuments(documentsResult);
                setProjects(projectsResult);
            } catch (error) {
                addToast('Failed to load documents', 'error');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [addToast]);

    if (loading) return <Card>Loading documents...</Card>;

    const handleUploadClick = (projectId: string) => {
        setSelectedProjectId(projectId);
        setIsUploadModalOpen(true);
    };

    const selectedProject = useMemo(() => {
        return projects.find(p => p.id === selectedProjectId);
    }, [projects, selectedProjectId]);

    const handleUploadSuccess = async () => {
        setLoading(true);
        try {
            if (!user.companyId) throw new Error('Company ID not found');
            const documentsResult = await api.getDocumentsByCompany(user.companyId);
            setDocuments(documentsResult);
        } catch (error) {
            addToast('Failed to refresh documents', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
                {canUpload && projects.length > 0 && (
                    <div className="flex gap-2">
                        <select
                            className="border rounded p-2"
                            value={selectedProjectId || ''}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            aria-label="Select project"
                            title="Select project"
                        >
                            <option value="" disabled>Select a project</option>
                            {projects.map(project => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                        </select>
                        <Button onClick={() => selectedProjectId && handleUploadClick(selectedProjectId)} disabled={!selectedProjectId}>
                            Upload Document
                        </Button>
                    </div>
                )}
            </div>

            <Card>
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Documents</h3>
                    {documents.length === 0 ? (
                        <p className="text-gray-500">No documents found</p>
                    ) : (
                        <div className="space-y-3">
                            {documents.slice(0, 10).map((doc) => (
                                <div key={doc.id} className="flex justify-between items-center p-3 border rounded-lg">
                                    <div>
                                        <h4 className="font-medium">{doc.name}</h4>
                                        <p className="text-sm text-gray-500">
                                            {doc.category} • {doc.type || 'Unknown'} • {doc.size || 'N/A'}
                                        </p>
                                    </div>
                                    <Button variant="secondary" size="sm">
                                        View
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {isUploadModalOpen && selectedProject && (
                <FileUploadModal
                    project={selectedProject}
                    onClose={() => setIsUploadModalOpen(false)}
                    onSuccess={handleUploadSuccess}
                    addToast={addToast}
                    user={user}
                />
            )}
        </div>
    );
};
