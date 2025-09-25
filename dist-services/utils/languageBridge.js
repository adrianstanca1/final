/**
 * Language Bridge Utilities
 *
 * Provides utilities for translating between different data formats and language paradigms
 * used in the multimodal system (TypeScript, Python, etc.)
 */
import { detectEnvironment } from './validation.js';
/**
 * Converts data between different formats
 */
export async function transformData(data, options) {
    const { sourceFormat, targetFormat, preserveTypes = true, strictMode = false } = options;
    // Simple case: No transformation needed
    if (sourceFormat === targetFormat) {
        return data;
    }
    // JSON to other formats
    if (sourceFormat === 'json') {
        if (targetFormat === 'text') {
            return typeof data === 'string' ? data : JSON.stringify(data);
        }
        if (targetFormat === 'form-data' && typeof FormData !== 'undefined') {
            const formData = new FormData();
            for (const [key, value] of Object.entries(data)) {
                formData.append(key, value);
            }
            return formData;
        }
        if (targetFormat === 'base64') {
            const jsonString = JSON.stringify(data);
            if (typeof btoa !== 'undefined') {
                // Browser
                return btoa(jsonString);
            }
            else if (typeof Buffer !== 'undefined') {
                // Node.js
                return Buffer.from(jsonString).toString('base64');
            }
        }
    }
    // Text to other formats
    if (sourceFormat === 'text') {
        if (targetFormat === 'json') {
            try {
                return JSON.parse(data);
            }
            catch (error) {
                if (strictMode) {
                    throw new Error('Failed to parse text as JSON');
                }
                return data;
            }
        }
        if (targetFormat === 'base64') {
            if (typeof btoa !== 'undefined') {
                // Browser
                return btoa(data);
            }
            else if (typeof Buffer !== 'undefined') {
                // Node.js
                return Buffer.from(data).toString('base64');
            }
        }
    }
    // Base64 to other formats
    if (sourceFormat === 'base64') {
        if (targetFormat === 'text') {
            if (typeof atob !== 'undefined') {
                // Browser
                return atob(data);
            }
            else if (typeof Buffer !== 'undefined') {
                // Node.js
                return Buffer.from(data, 'base64').toString('utf-8');
            }
        }
        if (targetFormat === 'json') {
            let text;
            if (typeof atob !== 'undefined') {
                // Browser
                text = atob(data);
            }
            else if (typeof Buffer !== 'undefined') {
                // Node.js
                text = Buffer.from(data, 'base64').toString('utf-8');
            }
            else {
                throw new Error('Base64 decoding not supported in this environment');
            }
            try {
                return JSON.parse(text);
            }
            catch (error) {
                if (strictMode) {
                    throw new Error('Failed to parse base64 data as JSON');
                }
                return text;
            }
        }
        if (targetFormat === 'binary' && typeof Buffer !== 'undefined') {
            return Buffer.from(data, 'base64');
        }
        if (targetFormat === 'image-data' && typeof fetch !== 'undefined') {
            const blob = await (await fetch(`data:image/png;base64,${data}`)).blob();
            return blob;
        }
    }
    // Handle Python specific formats in Node.js environment using proxy service
    if ((sourceFormat === 'python-dict' || sourceFormat === 'numpy-array') &&
        detectEnvironment() === 'node') {
        // This would typically involve a call to the Python service
        throw new Error(`Transformation from ${sourceFormat} not implemented in this environment`);
    }
    // Default fallback - return as-is with warning
    console.warn(`Transformation from ${sourceFormat} to ${targetFormat} not supported. Returning original data.`);
    return data;
}
/**
 * Creates a proxy object that automatically transforms data
 * when crossing language/environment boundaries
 */
export function createLanguageBridge(targetObject, sourceFormat, targetFormat) {
    return new Proxy(targetObject, {
        get(target, prop) {
            const value = Reflect.get(target, prop);
            // If the property is a function, wrap it to handle transformations
            if (typeof value === 'function') {
                return async (...args) => {
                    // Transform arguments if needed
                    const transformedArgs = await Promise.all(args.map(arg => transformData(arg, {
                        sourceFormat,
                        targetFormat,
                        preserveTypes: true
                    })));
                    // Call the original function
                    const result = await value.apply(target, transformedArgs);
                    // Transform the result back
                    return transformData(result, {
                        sourceFormat: targetFormat,
                        targetFormat: sourceFormat,
                        preserveTypes: true
                    });
                };
            }
            return value;
        }
    });
}
/**
 * Connects to a Python service using the language bridge
 */
export async function connectToPythonService(serviceUrl, interfaceDefinition) {
    // Create a proxy that forwards requests to the Python service
    return Object.keys(interfaceDefinition).reduce((acc, key) => {
        const method = interfaceDefinition[key];
        if (typeof method === 'function') {
            acc[key] = async (...args) => {
                const response = await fetch(`${serviceUrl}/${key}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ args }),
                });
                if (!response.ok) {
                    throw new Error(`Python service error: ${response.statusText}`);
                }
                return response.json();
            };
        }
        return acc;
    }, {});
}
/**
 * Helper for multimodal image processing that works with both the mm_service
 * and in-browser processing when available
 */
export async function processMultimodalImage(imageData, prompt, options = {}) {
    const { useLocal = false } = options;
    // Try to use the local Python service first
    if (!useLocal) {
        try {
            const formData = new FormData();
            if (typeof imageData === 'string') {
                // Handle base64 string
                const response = await fetch(imageData);
                const blob = await response.blob();
                formData.append('file', blob);
            }
            else {
                formData.append('file', imageData);
            }
            formData.append('prompt', prompt);
            const response = await fetch('http://localhost:8010/mm/preprocess', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                throw new Error('Failed to process image with mm_service');
            }
            return await response.json();
        }
        catch (error) {
            console.warn('Failed to use Python mm_service, falling back to browser processing', error);
            // Fall through to browser processing
        }
    }
    // Fall back to browser-based processing
    try {
        let img;
        if (typeof imageData === 'string') {
            // Already a data URL or URL
            img = await loadImage(imageData);
        }
        else {
            // Convert Blob/File to data URL
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(imageData);
            });
            img = await loadImage(dataUrl);
        }
        // Simple browser-based image scaling
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1024;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
        }
        else if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Convert to base64 JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const base64Data = dataUrl.split(',')[1];
        return {
            prompt,
            mimeType: 'image/jpeg',
            data: base64Data,
        };
    }
    catch (error) {
        console.error('Failed to process image in browser', error);
        throw new Error('Failed to process multimodal image in any available environment');
    }
}
// Helper function to load an image from a URL
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
}
//# sourceMappingURL=languageBridge.js.map