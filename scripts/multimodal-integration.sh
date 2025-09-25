#!/bin/bash

# multimodal-integration.sh
# This script sets up the proper integration between our different services

echo "Setting up multimodal integration..."

# Create necessary directories
mkdir -p dist/api
mkdir -p dist-services
mkdir -p dist/types
mkdir -p .venv

# Create a symlink for shared types between frontend and backend
echo "Creating type symlinks..."
ln -sf "$(pwd)/types.ts" "$(pwd)/dist/types/types.ts"
ln -sf "$(pwd)/types.ts" "$(pwd)/dist-services/types.ts"

# Fix import paths for backend services
echo "Creating import compatibility layer..."
cat > dist-services/moduleResolver.js << EOF
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
EOF

# Create a launcher script for the multimodal system
echo "Creating multimodal launcher..."
cat > scripts/start-multimodal.sh << EOF
#!/bin/bash

# Start Python service in background
echo "Starting Python MM service..."
source .venv/bin/activate
cd mm_service
uvicorn main:app --reload --port 8010 &
MM_PID=\$!
cd ..
deactivate

# Start backend service
echo "Starting backend services..."
node dist-services/services/index.js &
BACKEND_PID=\$!

# Start frontend
echo "Starting frontend..."
npx vite preview &
FRONTEND_PID=\$!

# Handle cleanup on exit
function cleanup {
  echo "Shutting down services..."
  kill \$MM_PID 2>/dev/null
  kill \$BACKEND_PID 2>/dev/null
  kill \$FRONTEND_PID 2>/dev/null
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for user input
echo "Multimodal system running. Press Ctrl+C to stop."
wait
EOF

chmod +x scripts/start-multimodal.sh

echo "Creating improved backend compatibility layer..."
mkdir -p utils/compatibility
cat > utils/compatibility/importBridge.js << EOF
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
    return \`\${importPath}.js\`;
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
EOF

echo "Integration setup complete!"