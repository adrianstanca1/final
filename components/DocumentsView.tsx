import React, { useState, useEffect } from 'react';
import { User, Document, Project } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { api } from '../services/mockApi';

interface DocumentsViewProps {
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
    isOnline?: boolean;
    settings?: any;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ user, addToast }) => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [documentsResult, projectsResult] = await Promise.all([
                    api.getDocuments(),
                    api.getProjects()
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
                <Button>Upload Document</Button>
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
                                            {doc.type} • {doc.size}
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
        </div>
    );
};
