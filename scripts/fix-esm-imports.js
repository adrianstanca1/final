#!/usr/bin/env node

/**
 * ESM Import Path Fixer
 * 
 * This script fixes TypeScript import paths in Node.js ESM modules
 * by adding the required .js extension to relative imports.
 * It solves the common error: "Relative import paths need explicit file extensions in ECMAScript imports"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const rootDir = path.resolve(__dirname, '..');
const dirsToProcess = [
  'services',
  'utils',
  'config',
];

// Extensions that should be explicitly added to imports
const TARGET_EXT = '.js';
const SOURCE_EXTS = ['.ts', '.tsx'];

// Regex to match import statements
const IMPORT_REGEX = /from\s+['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_REGEX = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/**
 * Check if a path is a relative import (starts with ./ or ../)
 */
function isRelativeImport(importPath) {
  return importPath.startsWith('./') || importPath.startsWith('../');
}

/**
 * Fix import paths in a file
 */
function fixImportsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Process regular imports
    const newContent = content.replace(IMPORT_REGEX, (match, importPath) => {
      // Only add extensions to relative imports that don't already have an extension
      if (isRelativeImport(importPath) && !path.extname(importPath)) {
        modified = true;
        return `from '${importPath}${TARGET_EXT}'`;
      }
      return match;
    }).replace(DYNAMIC_IMPORT_REGEX, (match, importPath) => {
      // Also handle dynamic imports
      if (isRelativeImport(importPath) && !path.extname(importPath)) {
        modified = true;
        return `import('${importPath}${TARGET_EXT}')`;
      }
      return match;
    });
    
    if (modified) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ Fixed imports in ${filePath.replace(rootDir, '')}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Process all files in a directory recursively
 */
function processDirectory(dirPath) {
  let fixedCount = 0;
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and dist directories
        if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'dist-services') {
          fixedCount += processDirectory(fullPath);
        }
      } else if (SOURCE_EXTS.includes(path.extname(entry.name))) {
        if (fixImportsInFile(fullPath)) {
          fixedCount++;
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error reading directory ${dirPath}: ${error.message}`);
  }
  
  return fixedCount;
}

// Main execution
console.log('🔍 Scanning files for ESM import paths to fix...');
let totalFixed = 0;

for (const dir of dirsToProcess) {
  const dirPath = path.join(rootDir, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`\nProcessing directory: ${dir}`);
    totalFixed += processDirectory(dirPath);
  } else {
    console.warn(`⚠️ Directory not found: ${dir}`);
  }
}

console.log(`\n✅ Fixed imports in ${totalFixed} files`);
if (totalFixed > 0) {
  console.log('🎉 Import paths fixed successfully! Try building again.');
} else {
  console.log('ℹ️ No files needed fixing.');
}