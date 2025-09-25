/**
 * Module resolution helper for backend services
 */

const path = require('path');
const fs = require('fs');

// Map of module paths to their actual locations
const moduleMappings = {
  '../utils/string': path.resolve(__dirname, '../utils/string'),
  '../utils/metrics': path.resolve(__dirname, '../utils/metrics'),
  '../utils/storage': path.resolve(__dirname, '../utils/storage'),
  '../utils/errorHandling': path.resolve(__dirname, '../utils/errorHandling'),
  '../types': path.resolve(__dirname, '../types'),
};

// Register our custom module resolver
require.extensions['.js'] = function(module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  
  // Replace problematic imports with resolved paths
  let transformedContent = content;
  for (const [importPath, resolvedPath] of Object.entries(moduleMappings)) {
    transformedContent = transformedContent.replace(
      new RegExp(`require\\(['"]${importPath}['"]\\)`, 'g'),
      `require('${resolvedPath}')`
    );
    transformedContent = transformedContent.replace(
      new RegExp(`from ['"]${importPath}['"]`, 'g'),
      `from '${resolvedPath}'`
    );
  }
  
  module._compile(transformedContent, filename);
};
