// File utility functions for the construction management app

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  const iconMap: { [key: string]: string } = {
    // Documents
    'pdf': '📄',
    'doc': '📝',
    'docx': '📝',
    'txt': '📄',
    'rtf': '📄',
    
    // Spreadsheets
    'xls': '📊',
    'xlsx': '📊',
    'csv': '📊',
    
    // Presentations
    'ppt': '📈',
    'pptx': '📈',
    
    // Images
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'png': '🖼️',
    'gif': '🖼️',
    'bmp': '🖼️',
    'svg': '🖼️',
    'webp': '🖼️',
    
    // CAD/Technical
    'dwg': '📐',
    'dxf': '📐',
    'step': '⚙️',
    'stp': '⚙️',
    'iges': '⚙️',
    'igs': '⚙️',
    
    // Archives
    'zip': '📦',
    'rar': '📦',
    '7z': '📦',
    'tar': '📦',
    'gz': '📦',
    
    // Video
    'mp4': '🎬',
    'avi': '🎬',
    'mov': '🎬',
    'wmv': '🎬',
    'flv': '🎬',
    'mkv': '🎬',
    
    // Audio
    'mp3': '🎵',
    'wav': '🎵',
    'flac': '🎵',
    'aac': '🎵',
    'ogg': '🎵',
    
    // Code/Development
    'js': '💻',
    'ts': '💻',
    'jsx': '💻',
    'tsx': '💻',
    'html': '💻',
    'css': '💻',
    'json': '💻',
    'xml': '💻',
    'yaml': '💻',
    'yml': '💻',
    
    // Default
    'default': '📁'
  };
  
  return iconMap[extension] || iconMap['default'];
};

export const getMimeType = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  const mimeMap: { [key: string]: string } = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'rtf': 'application/rtf',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'csv': 'text/csv',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'dwg': 'image/vnd.dwg',
    'dxf': 'image/vnd.dxf',
    'zip': 'application/zip',
    'rar': 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'mkv': 'video/x-matroska',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'ogg': 'audio/ogg',
    'js': 'application/javascript',
    'ts': 'application/typescript',
    'jsx': 'text/jsx',
    'tsx': 'text/tsx',
    'html': 'text/html',
    'css': 'text/css',
    'json': 'application/json',
    'xml': 'application/xml',
    'yaml': 'application/x-yaml',
    'yml': 'application/x-yaml'
  };
  
  return mimeMap[extension] || 'application/octet-stream';
};

export const isImageFile = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
  return imageExtensions.includes(extension);
};

export const isVideoFile = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
  return videoExtensions.includes(extension);
};

export const isAudioFile = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg'];
  return audioExtensions.includes(extension);
};

export const isCADFile = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const cadExtensions = ['dwg', 'dxf', 'step', 'stp', 'iges', 'igs'];
  return cadExtensions.includes(extension);
};

export const isDocumentFile = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'csv', 'ppt', 'pptx'];
  return documentExtensions.includes(extension);
};

export const getFileCategory = (filename: string): 'image' | 'video' | 'audio' | 'document' | 'cad' | 'archive' | 'code' | 'other' => {
  if (isImageFile(filename)) return 'image';
  if (isVideoFile(filename)) return 'video';
  if (isAudioFile(filename)) return 'audio';
  if (isDocumentFile(filename)) return 'document';
  if (isCADFile(filename)) return 'cad';
  
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz'];
  const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml', 'yaml', 'yml'];
  
  if (archiveExtensions.includes(extension)) return 'archive';
  if (codeExtensions.includes(extension)) return 'code';
  
  return 'other';
};