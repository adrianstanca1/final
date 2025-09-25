/**
 * Module resolution helper for cross-environment imports
 * This module provides consistent path resolution between Node.js and browser environments
 */
import path from 'path';
import { fileURLToPath } from 'url';
// Helper for consistent __dirname in ESM
export const getDirname = (importMetaUrl) => {
    return path.dirname(fileURLToPath(importMetaUrl));
};
// Helper for resolving paths relative to the project root
export const resolveProjectPath = (relativePath, importMetaUrl) => {
    if (typeof process !== 'undefined' && process.cwd) {
        // Node.js environment
        return path.resolve(process.cwd(), relativePath);
    }
    // Browser environment with import.meta.url
    if (importMetaUrl) {
        const dirname = getDirname(importMetaUrl);
        const projectRoot = path.resolve(dirname, '..');
        return path.resolve(projectRoot, relativePath);
    }
    // Fallback - just return the relative path
    return relativePath;
};
// For dynamic imports across environments
export const dynamicImport = async (modulePath) => {
    try {
        // Try direct import
        return await import(modulePath);
    }
    catch (error) {
        // Try with resolved path
        const resolved = resolveProjectPath(modulePath);
        return await import(resolved);
    }
};
//# sourceMappingURL=moduleResolver.js.map