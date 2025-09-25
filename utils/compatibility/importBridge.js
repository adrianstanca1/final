/**
 * Import Bridge - Resolves import compatibility issues between ESM and CommonJS
 */
const fs = require('fs');
const path = require('path');

// Map ECMAScript imports to CommonJS when needed
function resolveImport(importPath) {
  // Add .js extension if needed for Node.js ESM
  if (!importPath.endsWith('.js') && 
      !importPath.endsWith('.json') && 
      !importPath.includes('node_modules')) {
    return `${importPath}.js`;
  }
  return importPath;
}

// Process a file to add .js extensions to imports
function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Replace import statements
  const updatedContent = content.replace(
    /import\s+(?:(?:\{[^}]*\})|(?:[^{}]*))?\s+from\s+['"]([^'"]+)['"]/g,
    (match, importPath) => {
      const resolvedPath = resolveImport(importPath);
      return match.replace(importPath, resolvedPath);
    }
  );
  
  fs.writeFileSync(filePath, updatedContent, 'utf8');
}

// Process files recursively in a directory
function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.name.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

module.exports = {
  processFile,
  processDirectory,
  resolveImport
};
