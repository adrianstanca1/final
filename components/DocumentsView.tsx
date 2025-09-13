import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, Document, Project, Permission, DocumentCategory, DocumentStatus, DocumentFolder, DocumentVersion, CompanySettings } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { DocumentStatusBadge } from './ui/StatusBadge';
import { hasPermission } from '../services/auth';
import { Avatar } from './ui/Avatar';


// --- UploadDocumentModal Constants ---
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 5;
const ACCEPTED_FILE_TYPES_MAP = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/zip': ['.zip'],
};
const ACCEPTED_MIMES = Object.keys(ACCEPTED_FILE_TYPES_MAP);
const ACCEPTED_EXTENSIONS = Object.values(ACCEPTED_FILE_TYPES_MAP).flat().join(', ');

type UploadableFile = {
  id: string;
  file: File;
  status: 'waiting' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
  previewUrl?: string | null;
};

type UploadLogEntry = {
    id: string;
    fileName: string;
    status: 'success' | 'error';
    message: string;
    timestamp: Date;
};

// --- Accessibility Audit Components ---
const AuditInfoDisplay: React.FC<{ info: { role: string; label: string; shortcut?: string; } }> = ({ info }) => (
    <div className="absolute bottom-full left-0 mb-2 w-max max-w-xs p-2 text-xs text-white bg-slate-900/90 rounded-md shadow-lg z-20 pointer-events-none" data-testid="audit-info">
        <strong className="block text-sky-400">A11y Info</strong>
        <div><strong>Role:</strong> {info.role}</div>
        <div><strong>Label:</strong> {info.label}</div>
        {info.shortcut && <div><strong>Shortcut:</strong> {info.shortcut}</div>}
    </div>
);

const AuditableWrapper: React.FC<{ children: React.ReactElement; auditInfo: { role: string; label: string; shortcut?: string }; auditEnabled: boolean }> = ({ children, auditInfo, auditEnabled }) => {
    const [showAudit, setShowAudit] = useState(false);
    if (!auditEnabled) return children;

    const show = () => setShowAudit(true);
    const hide = () => setShowAudit(false);

    return (
        <div className="relative" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
            {children}
            {showAudit && <AuditInfoDisplay info={auditInfo} />}
        </div>
    );
};

const AuditChecklist: React.FC = () => (
    <div className="mt-4 p-3 border-2 border-dashed border-sky-500 rounded-lg bg-sky-50 dark:bg-sky-900/30" data-testid="audit-checklist">
        <h4 className="font-bold text-sm text-sky-800 dark:text-sky-200">Accessibility Audit Checklist</h4>
        <ul className="mt-2 list-disc list-inside text-xs text-sky-700 dark:text-sky-300 space-y-1">
            <li>Verify focus is trapped within the modal.</li>
            <li>Test all controls with keyboard (Tab, Enter, Space, Esc, Arrows).</li>
            <li>Check screen reader announcements for status changes (e.g., upload progress, success, error).</li>
            <li>Confirm all interactive elements have clear, descriptive labels.</li>
        </ul>
    </div>
);


const FileTypeIcon: React.FC<{ fileType: string, className?: string }> = ({ fileType, className = "h-10 w-10" }) => {
    let icon = <svg xmlns="http://www.w3.org/2000/svg" className={`${className} text-slate-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><title>Generic file icon</title><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;

    if (fileType.startsWith('image/')) {
        icon = <svg xmlns="http://www.w3.org/2000/svg" className={`${className} text-purple-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><title>Image file icon</title><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
    } else if (fileType === 'application/pdf') {
        icon = <svg xmlns="http://www.w3.org/2000/svg" className={`${className} text-red-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><title>PDF file icon</title><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    } else if (fileType.includes('word')) {
        icon = <svg xmlns="http://www.w3.org/2000/svg" className={`${className} text-blue-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><title>Word document icon</title><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    } else if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
        icon = <svg xmlns="http://www.w3.org/2000/svg" className={`${className} text-green-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><title>Spreadsheet file icon</title><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    } else if (fileType.includes('presentation') || fileType.includes('powerpoint')) {
        icon = <svg xmlns="http://www.w3.org/2000/svg" className={`${className} text-orange-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><title>Presentation file icon</title><path strokeLinecap="round" strokeLinejoin="round" d="M16 12l-4 4m0 0l-4-4m4 4V4M4 16h16" /></svg>;
    } else if (fileType.includes('zip') || fileType.includes('archive')) {
        icon = <svg xmlns="http://www.w3.org/2000/svg" className={`${className} text-gray-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><title>Archive file icon</title><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6M12 10v6m-5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-1" /></svg>;
    }
    return icon;
};

// --- FileUploadItem Sub-Component ---
interface FileUploadItemProps {
    item: UploadableFile;
    isDragging: boolean;
    isFocused: boolean;
    onRemove: (id: string) => void;
    onRetry: (id: string) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragEnter: (e: React.DragEvent, id: string) => void;
    onDragEnd: (e: React.DragEvent) => void;
}

const FileUploadItem = React.forwardRef<HTMLLIElement, FileUploadItemProps>(({ item, isDragging, isFocused, onRemove, onRetry, onDragStart, onDragEnter, onDragEnd }, ref) => {
    const { file, status, progress, error, previewUrl } = item;
    
    const statusIcon = useMemo(() => {
        switch(status) {
            case 'uploading':
            case 'processing':
                return <div className="w-5 h-5 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" aria-label="Uploading"></div>;
            case 'success':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><title>Success</title><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
            case 'error':
                 return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><title>Error</title><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;
            default:
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><title>Waiting</title><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>;
        }
    }, [status]);

    return (
        <li
            ref={ref}
            tabIndex={-1}
            draggable={status === 'waiting'}
            onDragStart={(e) => onDragStart(e, item.id)}
            onDragEnter={(e) => onDragEnter(e, item.id)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={`p-3 bg-slate-50 dark:bg-slate-800 rounded-lg transition-all duration-300 outline-none ${status === 'waiting' && 'cursor-grab'} ${isDragging ? 'opacity-50' : 'opacity-100'} ${isFocused ? 'ring-2 ring-sky-500' : ''}`}
            aria-label={`File: ${file.name}. Status: ${status}. Use keyboard shortcuts for actions.`}
            data-testid={`file-item-${item.id}`}
        >
            <div className="flex items-center gap-3">
                {previewUrl ? (
                    <img src={previewUrl} alt={`Preview for ${file.name}`} className="h-10 w-10 rounded-md object-cover flex-shrink-0" />
                ) : (
                    <FileTypeIcon fileType={file.type} />
                )}
                <div className="flex-grow overflow-hidden">
                    <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">{file.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="flex items-center gap-2">
                    <div role="status">{statusIcon}</div>
                     {status === 'waiting' && <button type="button" onClick={() => onRemove(item.id)} className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-500" aria-label={`Remove ${file.name}`} data-testid={`remove-btn-${item.id}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>}
                     {status === 'error' && <Button type="button" size="sm" variant="secondary" onClick={() => onRetry(item.id)} aria-label={`Retry upload for ${file.name}`} data-testid={`retry-btn-${item.id}`}>Retry</Button>}
                </div>
            </div>
            <div role="status" aria-live="polite" className="sr-only">
                {status === 'uploading' ? `Uploading ${file.name}, ${progress}% complete.` : `File ${file.name} status is now ${status}.`}
                {status === 'error' && ` Error: ${error}`}
            </div>
            {status === 'uploading' || status === 'processing' || status === 'success' ? (
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1 mt-2">
                    <div
                      className="bg-sky-600 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${file.name} upload progress`}
                    ></div>
                </div>
            ) : null}
            {status === 'error' && (
                <div role="alert" className="mt-2 p-2 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-md text-xs flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><title>Alert icon</title><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    <span>{error}</span>
                </div>
            )}
        </li>
    );
});

// --- UploadDocumentModal Sub-Component ---
interface UploadDocumentModalProps {
    user: User;
    project: Project;
    folderId: number | null;
    documentToUpdate?: Document | null;
    uploadLog: UploadLogEntry[];
    setUploadLog: React.Dispatch<React.SetStateAction<UploadLogEntry[]>>;
    onClose: () => void;
    onUploadSuccess: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
    settings: CompanySettings | null;
}

const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
    user,
    project,
    folderId,
    documentToUpdate = null,
    uploadLog,
    setUploadLog,
    onClose,
    onUploadSuccess,
    addToast,
    settings,
}) => {
    const isNewVersion = !!documentToUpdate;
    const [files, setFiles] = useState<UploadableFile[]>([]);
    const [category, setCategory] = useState<DocumentCategory>(DocumentCategory.PLANS);
    const [changeNotes, setChangeNotes] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
    const [showLog, setShowLog] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [focusedIndex, setFocusedIndex] = useState(-1);
    const modalRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

    const autoStartUploads = settings?.uploadPreferences?.autoStart || false;
    const accessibilityAuditEnabled = settings?.developer?.accessibilityAudit || false;

    useEffect(() => {
        itemRefs.current = itemRefs.current.slice(0, files.length);
    }, [files.length]);

    useEffect(() => {
        if (focusedIndex !== -1 && itemRefs.current[focusedIndex]) {
            itemRefs.current[focusedIndex]?.focus();
        }
    }, [focusedIndex]);

    useEffect(() => {
        modalRef.current?.focus();
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            !isUploading && onClose();
            return;
        }

        if (files.length === 0) return;

        let newIndex = focusedIndex;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            newIndex = focusedIndex === -1 ? 0 : (focusedIndex + 1) % files.length;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            newIndex = focusedIndex <= 0 ? files.length - 1 : focusedIndex - 1;
        } else if (e.key === 'Delete' && focusedIndex !== -1) {
            handleRemoveFile(files[focusedIndex].id);
        } else if (e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && focusedIndex !== -1) {
            e.preventDefault();
            const fromIndex = focusedIndex;
            const toIndex = e.key === 'ArrowUp' ? fromIndex - 1 : fromIndex + 1;

            if (toIndex >= 0 && toIndex < files.length) {
                const newFiles = [...files];
                const [movedItem] = newFiles.splice(fromIndex, 1);
                newFiles.splice(toIndex, 0, movedItem);
                setFiles(newFiles);
                setFocusedIndex(toIndex);
            }
            return; // Prevent focus change below
        }
        setFocusedIndex(newIndex);
    };

    const handleUpload = useCallback(async () => {
        const filesToUpload = files.filter(f => f.status === 'waiting');
        if (filesToUpload.length === 0) {
            if (!autoStartUploads) addToast("No files in queue to upload.", "error");
            return;
        }

        setIsUploading(true);

        for (const file of filesToUpload) {
            try {
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'uploading' } : f));
                await new Promise(r => setTimeout(r, 200));
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, progress: 50 } : f));
                await new Promise(r => setTimeout(r, 500));
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, progress: 80, status: 'processing' } : f));

                if (isNewVersion) {
                    await api.uploadNewVersion(documentToUpdate.id, user.id, changeNotes);
                } else {
                    const docName = file.file.name.replace(/\.[^/.]+$/, "");
                    await api.uploadDocument(docName, project.id, category, user.id, folderId);
                }
                
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, progress: 100, status: 'success' } : f));
                setUploadLog(prev => {
                    const newEntry: UploadLogEntry = { id: file.id, fileName: file.file.name, status: 'success', message: `Uploaded to ${project.name}`, timestamp: new Date() };
                    return [newEntry, ...prev].slice(0, 10);
                });

            } catch (error) {
                const errorMessage = 'Upload failed on server';
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'error', error: errorMessage } : f));
                setUploadLog(prev => {
                    const newEntry: UploadLogEntry = { id: file.id, fileName: file.file.name, status: 'error', message: errorMessage, timestamp: new Date() };
                    return [newEntry, ...prev].slice(0, 10);
                });
            }
        }
        
        setIsUploading(false);
        onUploadSuccess();
    }, [files, isNewVersion, documentToUpdate, user.id, changeNotes, project.id, project.name, category, folderId, onUploadSuccess, setUploadLog, addToast, autoStartUploads]);


    const addFilesToQueue = useCallback((newFiles: FileList) => {
        const filesToAdd = Array.from(newFiles);
        const rejected: { name: string, reason: string }[] = [];
        let accepted: UploadableFile[] = [];

        if (files.length + filesToAdd.length > MAX_FILES_PER_UPLOAD && !isNewVersion) {
            addToast(`You can only upload up to ${MAX_FILES_PER_UPLOAD} files at a time.`, 'error');
            return;
        }

        filesToAdd.forEach(file => {
            if (file.size > MAX_FILE_SIZE_BYTES) {
                rejected.push({ name: file.name, reason: `Exceeds ${MAX_FILE_SIZE_MB}MB limit` });
            } else if (!ACCEPTED_MIMES.includes(file.type)) {
                rejected.push({ name: file.name, reason: 'Invalid file type' });
            } else {
                const newUploadableFile: UploadableFile = {
                    id: `${file.name}-${file.lastModified}-${Math.random()}`,
                    file: file,
                    status: 'waiting',
                    progress: 0,
                    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
                };
                accepted.push(newUploadableFile);
            }
        });
        
        if (rejected.length > 0) {
            addToast(`${rejected.length} file(s) were rejected. Please check file type and size.`, 'error');
        }
        
        if (isNewVersion) accepted = accepted.slice(0, 1);

        setFiles(prev => [...prev, ...accepted]);
    }, [files.length, isNewVersion, addToast]);
    
    useEffect(() => {
        if (autoStartUploads && files.some(f => f.status === 'waiting')) {
            handleUpload();
        }
    }, [files, autoStartUploads, handleUpload]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) addFilesToQueue(e.target.files);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) addFilesToQueue(e.dataTransfer.files);
    };
    
    const handleRemoveFile = (id: string) => {
        const removedIndex = files.findIndex(f => f.id === id);
        setFiles(prev => prev.filter(f => f.id !== id));
        if (focusedIndex === removedIndex) {
            setFocusedIndex(-1);
        } else if (focusedIndex > removedIndex) {
            setFocusedIndex(prev => prev - 1);
        }
    };

    const handleRetryFile = (id: string) => setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'waiting', progress: 0, error: undefined } : f));
    
    const handleDragStart = (e: React.DragEvent, id: string) => { setDraggedFileId(id); e.dataTransfer.effectAllowed = 'move'; };
    const handleDragEnter = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedFileId || draggedFileId === targetId) return;

        const newFiles = [...files];
        const draggedIndex = newFiles.findIndex(f => f.id === draggedFileId);
        const targetIndex = newFiles.findIndex(f => f.id === targetId);
        if (draggedIndex === -1 || targetIndex === -1) return;

        const [draggedItem] = newFiles.splice(draggedIndex, 1);
        newFiles.splice(targetIndex, 0, draggedItem);
        setFiles(newFiles);
    };
    const handleDragEnd = (e: React.DragEvent) => { setDraggedFileId(null); };

    const handleRetryAll = () => {
        setFiles(prev => prev.map(f => f.status === 'error' ? { ...f, status: 'waiting', progress: 0, error: undefined } : f));
        addToast("Retrying all failed uploads.", "success");
    };

    const hasFailedUploads = useMemo(() => files.some(f => f.status === 'error'), [files]);
    const waitingFilesCount = files.filter(f => f.status === 'waiting').length;
    const isUploadComplete = files.length > 0 && files.every(f => f.status === 'success' || f.status === 'error');
    
    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
            onClick={!isUploading ? onClose : undefined}
            onKeyDown={handleKeyDown}
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-modal-title"
        >
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()} data-testid="upload-modal">
                <div className="flex justify-between items-center mb-4">
                    <h2 id="upload-modal-title" className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {isNewVersion ? `Upload New Version for "${documentToUpdate.name}"` : 'Upload Documents'}
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="relative group">
                            <button className="text-slate-400 hover:text-sky-600" aria-label="Show keyboard shortcuts">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><title>Keyboard shortcuts</title><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                            </button>
                             <div className="absolute bottom-full right-0 mb-2 w-48 p-2 text-xs text-white bg-slate-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" role="tooltip">
                                <strong className="block">Keyboard Shortcuts:</strong>
                                <strong>↑/↓:</strong> Navigate files<br/>
                                <strong>Ctrl + ↑/↓:</strong> Reorder file<br/>
                                <strong>Delete:</strong> Remove file<br/>
                                <strong>Esc:</strong> Close window
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setShowLog(!showLog)} aria-expanded={showLog}>
                            {showLog ? 'Hide Log' : 'Show Log'}
                        </Button>
                    </div>
                </div>
                
                 <div className={`relative transition-all duration-300 ease-in-out ${showLog ? 'mb-4' : ''}`}>
                    <div aria-live="polite" className={`overflow-hidden transition-all duration-300 ease-in-out ${showLog ? 'max-h-60' : 'max-h-0'}`}>
                        <div className={`p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-2 max-h-56 overflow-y-auto ${accessibilityAuditEnabled ? 'border-2 border-dashed border-sky-500' : ''}`} data-testid="upload-log">
                            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Recent Uploads</h4>
                            {uploadLog.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400">No recent activity.</p> : uploadLog.map(log => (
                                <div key={log.id} className="flex items-center gap-2 text-xs">
                                    {log.status === 'success' ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><title>Success icon</title><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><title>Error icon</title><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>}
                                    <p className="truncate flex-grow text-slate-700 dark:text-slate-300" title={log.fileName}>{log.fileName}</p>
                                    <p className="text-slate-500 dark:text-slate-400 flex-shrink-0">{log.timestamp.toLocaleTimeString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleUpload(); }}>
                    {files.length === 0 && (
                        <div>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple={!isNewVersion} accept={ACCEPTED_MIMES.join(',')} className="sr-only" aria-hidden="true" />
                             <AuditableWrapper auditEnabled={accessibilityAuditEnabled} auditInfo={{ role: 'button', label: `File upload zone. Accepted formats: ${ACCEPTED_EXTENSIONS}. Maximum size: ${MAX_FILE_SIZE_MB}MB per file.`, shortcut: 'Enter' }}>
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`File upload zone. Accepted formats: ${ACCEPTED_EXTENSIONS}. Maximum size: ${MAX_FILE_SIZE_MB}MB per file.`}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                                    className={`flex flex-col justify-center items-center p-6 border-2 border-dashed rounded-lg transition-colors duration-200 cursor-pointer outline-none focus:ring-2 focus:ring-sky-500
                                        ${isDragging ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500'}`}
                                    data-testid="drop-zone"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    <p className="mt-2 font-semibold text-sky-600 dark:text-sky-400">{isDragging ? 'Drop to upload' : 'Click to upload or drag and drop'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{isNewVersion ? 'Drop one file here' : `Drop up to ${MAX_FILES_PER_UPLOAD} files here`}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{ACCEPTED_EXTENSIONS}. Max size: {MAX_FILE_SIZE_MB}MB per file.</p>
                                </div>
                             </AuditableWrapper>
                        </div>
                    )}
                    
                    {files.length > 0 && (
                        <ul className="space-y-3 max-h-64 overflow-y-auto p-1 -m-1" data-testid="file-list">
                            {files.map((item, index) => (
                                <AuditableWrapper key={item.id} auditEnabled={accessibilityAuditEnabled} auditInfo={{ role: 'listitem', label: `File: ${item.file.name}, Status: ${item.status}`, shortcut: 'Arrows to navigate, Delete to remove' }}>
                                    <FileUploadItem 
                                        ref={el => { itemRefs.current[index] = el; }}
                                        item={item} 
                                        isDragging={draggedFileId === item.id}
                                        isFocused={index === focusedIndex}
                                        onRemove={handleRemoveFile} 
                                        onRetry={handleRetryFile}
                                        onDragStart={handleDragStart}
                                        onDragEnter={handleDragEnter}
                                        onDragEnd={handleDragEnd}
                                    />
                                </AuditableWrapper>
                            ))}
                        </ul>
                    )}
                    
                    {!isNewVersion && (
                        <div>
                            <label htmlFor="doc-category" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Category (for all files)</label>
                            <select id="doc-category" value={category} onChange={e => setCategory(e.target.value as DocumentCategory)} className="w-full p-2 border rounded-md" disabled={isUploading}>
                                {Object.values(DocumentCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    )}

                    {isNewVersion && (
                         <div>
                            <label htmlFor="change-notes" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Version Notes (Optional)</label>
                            <textarea id="change-notes" value={changeNotes} onChange={e => setChangeNotes(e.target.value)} rows={2} className="w-full p-2 border rounded-md" placeholder="e.g., Updated with client feedback." disabled={isUploading}/>
                        </div>
                    )}
                    
                    {accessibilityAuditEnabled && <AuditChecklist />}

                    <div className="flex justify-between items-center gap-2 pt-4 border-t dark:border-slate-700">
                        <div>
                           {hasFailedUploads && !isUploading && (
                               <AuditableWrapper auditEnabled={accessibilityAuditEnabled} auditInfo={{ role: 'button', label: 'Retry all failed uploads' }}>
                                   <Button type="button" variant="secondary" onClick={handleRetryAll} aria-label="Retry all failed uploads" data-testid="retry-all-btn">Retry All</Button>
                               </AuditableWrapper>
                           )}
                        </div>
                        <div className="flex gap-2">
                            {isUploadComplete ? (
                                <AuditableWrapper auditEnabled={accessibilityAuditEnabled} auditInfo={{ role: 'button', label: 'Done' }}>
                                    <Button type="button" variant="secondary" onClick={onClose}>Done</Button>
                                </AuditableWrapper>
                            ) : (
                                <>
                                    <AuditableWrapper auditEnabled={accessibilityAuditEnabled} auditInfo={{ role: 'button', label: 'Cancel upload', shortcut: 'Esc' }}>
                                        <Button type="button" variant="secondary" onClick={onClose} disabled={isUploading}>Cancel</Button>
                                    </AuditableWrapper>
                                     <AuditableWrapper auditEnabled={accessibilityAuditEnabled} auditInfo={{ role: 'button', label: `Upload ${waitingFilesCount} files to project ${project.name}`, shortcut: 'Enter' }}>
                                        <Button type="submit" isLoading={isUploading} disabled={waitingFilesCount === 0 || autoStartUploads} data-testid="upload-btn" aria-describedby="upload-button-description">
                                            {isUploading ? 'Uploading...' : `Upload ${waitingFilesCount} File${waitingFilesCount !== 1 ? 's' : ''}`}
                                        </Button>
                                     </AuditableWrapper>
                                    <span id="upload-button-description" className="sr-only">
                                        Uploads {waitingFilesCount} files to project {project.name}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </form>
            </Card>
        </div>
    );
};


// --- DocumentIcon Sub-Component ---
const DocumentIcon: React.FC<{ category: DocumentCategory }> = ({ category }) => {
    const icons = {
        [DocumentCategory.PLANS]: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><title>Plans icon</title><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m-6 3l6-3m0 0l6 3m-6-3v10" /></svg>,
        [DocumentCategory.PERMITS]: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><title>Permits icon</title><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
        [DocumentCategory.INVOICES]: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><title>Invoices icon</title><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        [DocumentCategory.REPORTS]: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><title>Reports icon</title><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
        [DocumentCategory.PHOTOS]: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><title>Photos icon</title><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    };
    return icons[category] || icons[DocumentCategory.REPORTS];
};

const FolderIcon: React.FC<{}> = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <title>Folder icon</title>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
);

const BreadcrumbChevron: React.FC<{}> = () => (
    <svg className="h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
    </svg>
);


interface DocumentsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline: boolean;
  settings: CompanySettings | null;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ user, addToast, isOnline, settings }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    
    const [folders, setFolders] = useState<DocumentFolder[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: number | null, name: string }[]>([]);

    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [documentToUpdate, setDocumentToUpdate] = useState<Document | null>(null);
    const [uploadLog, setUploadLog] = useState<UploadLogEntry[]>([]);
    const [activeDocMenu, setActiveDocMenu] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    
    const canManage = hasPermission(user, Permission.MANAGE_DOCUMENTS);
    const canUpload = hasPermission(user, Permission.UPLOAD_DOCUMENTS);

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
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveDocMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
    
    const handleUploadSuccess = () => {
        if (currentProject) {
            fetchFolderContents(currentProject.id, currentFolderId);
        }
    };
    
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
            {isUploadModalOpen && currentProject && (
                <UploadDocumentModal
                    user={user}
                    project={currentProject}
                    folderId={currentFolderId}
                    documentToUpdate={documentToUpdate}
                    uploadLog={uploadLog}
                    setUploadLog={setUploadLog}
                    onClose={() => setIsUploadModalOpen(false)}
                    onUploadSuccess={handleUploadSuccess}
                    addToast={addToast}
                    settings={settings}
                />
            )}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Documents</h2>
                    <select
                        value={currentProject?.id || ''}
                        onChange={e => handleProjectChange(e.target.value)}
                        className="p-2 border rounded-md"
                        disabled={loading}
                        aria-label="Select a project"
                    >
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                {canUpload && <div className="flex gap-2">
                    {canManage && <Button variant="secondary">New Folder</Button>}
                    <Button onClick={() => { setDocumentToUpdate(null); setIsUploadModalOpen(true); }} disabled={!isOnline || !currentProject}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Upload
                    </Button>
                </div>}
            </div>
            
            <Card className="p-0 overflow-hidden">
                 <div className="p-4 border-b dark:border-slate-700">
                    <nav className="flex items-center text-sm font-medium text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
                        <button onClick={() => handleBreadcrumbClick(null, -1)} className="hover:text-slate-700 dark:hover:text-slate-200 hover:underline">{currentProject?.name}</button>
                        {breadcrumbs.map((crumb, index) => (
                            <div key={crumb.id} className="flex items-center">
                                <BreadcrumbChevron />
                                <button onClick={() => handleBreadcrumbClick(crumb.id, index)} className="ml-2 hover:text-slate-700 dark:hover:text-slate-200 hover:underline truncate">{crumb.name}</button>
                            </div>
                        ))}
                    </nav>
                </div>
                {loading ? <p className="p-6 text-center text-slate-500">Loading...</p> : (
                    <>
                        <div className="overflow-x-auto">
                             <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Version</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Updated</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-card divide-y divide-gray-200 dark:divide-slate-700">
                                    {folders.map(folder => (
                                        <tr key={`folder-${folder.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button onClick={() => handleFolderClick(folder.id)} className="flex items-center gap-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                    <FolderIcon />
                                                    {folder.name}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">-</td>
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">-</td>
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">-</td>
                                            <td className="px-6 py-4"></td>
                                        </tr>
                                    ))}
                                     {documents.map(doc => (
                                        <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    <DocumentIcon category={doc.category} />
                                                    <span className="truncate" title={doc.name}>{doc.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">v{doc.latestVersionNumber}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(doc.updatedAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap"><DocumentStatusBadge status={doc.status} /></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="relative" ref={activeDocMenu === doc.id ? menuRef : null}>
                                                    <button onClick={(e) => { e.stopPropagation(); setActiveDocMenu(activeDocMenu === doc.id ? null : doc.id) }} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" aria-label={`Actions for ${doc.name}`}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><title>More actions</title><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                                    </button>
                                                     {activeDocMenu === doc.id && canUpload && (
                                                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 border dark:border-slate-700 z-10" role="menu">
                                                            <button
                                                                role="menuitem"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDocumentToUpdate(doc);
                                                                    setIsUploadModalOpen(true);
                                                                    setActiveDocMenu(null);
                                                                }}
                                                                className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                                Upload New Version
                                                            </button>
                                                            {/* Other actions can go here */}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {folders.length === 0 && documents.length === 0 && (
                            <div className="text-center py-20 text-slate-500 dark:text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                <h3 className="mt-2 text-lg font-semibold">Empty Folder</h3>
                                <p className="mt-1 text-sm">This folder has no documents or sub-folders.</p>
                            </div>
                        )}
                    </>
                )}
            </Card>
        </div>
    );
};