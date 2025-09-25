#!/usr/bin/env node

/**
 * Multimodal Diagnostic Tool
 * 
 * This script analyzes the multimodal project structure and identifies the most critical issues to fix.
 * It checks TypeScript configurations, import paths, and compatibility between different parts of the system.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Colors for output
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';

console.log(`${BLUE}======================================${RESET}`);
console.log(`${BLUE}  MULTIMODAL SYSTEM DIAGNOSTIC TOOL   ${RESET}`);
console.log(`${BLUE}======================================${RESET}\n`);

// Check if necessary files exist
const requiredFiles = [
  'tsconfig.base.json',
  'tsconfig.frontend.json',
  'tsconfig.api.json',
  'tsconfig.services.json',
  'utils/languageBridge.ts',
  'utils/moduleResolver.ts',
  'utils/validation.ts',
  'scripts/multimodal-integration-fixed.sh',
  'scripts/build-multimodal.js'
];

console.log(`${CYAN}Checking required files...${RESET}`);
let missingFiles = 0;
for (const file of requiredFiles) {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`${GREEN}✅ ${file}${RESET}`);
  } else {
    console.log(`${RED}❌ ${file} (MISSING)${RESET}`);
    missingFiles++;
  }
}

if (missingFiles > 0) {
  console.log(`\n${RED}Error: ${missingFiles} required files are missing.${RESET}`);
} else {
  console.log(`\n${GREEN}All required files present.${RESET}`);
}

// Analyze TypeScript configurations
console.log(`\n${CYAN}Analyzing TypeScript configurations...${RESET}`);

try {
  const baseConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'tsconfig.base.json'), 'utf8'));
  const frontendConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'tsconfig.frontend.json'), 'utf8'));
  const apiConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'tsconfig.api.json'), 'utf8'));
  const servicesConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'tsconfig.services.json'), 'utf8'));
  
  console.log(`${GREEN}✅ All TypeScript configurations are valid JSON${RESET}`);
  
  // Check for critical configuration mismatches
  if (apiConfig.compilerOptions.moduleResolution !== servicesConfig.compilerOptions.moduleResolution) {
    console.log(`${YELLOW}⚠️  Module resolution mismatch: API uses ${apiConfig.compilerOptions.moduleResolution}, Services uses ${servicesConfig.compilerOptions.moduleResolution}${RESET}`);
  } else {
    console.log(`${GREEN}✅ API and Services use consistent module resolution${RESET}`);
  }
  
  if (apiConfig.compilerOptions.module !== servicesConfig.compilerOptions.module) {
    console.log(`${YELLOW}⚠️  Module type mismatch: API uses ${apiConfig.compilerOptions.module}, Services uses ${servicesConfig.compilerOptions.module}${RESET}`);
  } else {
    console.log(`${GREEN}✅ API and Services use consistent module type${RESET}`);
  }
} catch (error) {
  console.log(`${RED}❌ Error analyzing TypeScript configurations: ${error.message}${RESET}`);
}

// Check for potential path issues
console.log(`\n${CYAN}Checking for path issues...${RESET}`);

const fileWithExtRegex = /import .* from ['"](.+\.\w+)['"]/g;
const relativeImportRegex = /import .* from ['"](\.[^'"]+)['"]/g;

try {
  // Analyze a sample of TypeScript files for path issues
  const dirsToSample = ['services', 'utils'];
  let pathIssueCount = 0;
  
  for (const dir of dirsToSample) {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) continue;
    
    const files = fs.readdirSync(dirPath)
      .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
      .slice(0, 5); // Sample up to 5 files per directory
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for explicit file extensions in imports (which can cause issues in certain configs)
      const explicitExtensions = [...content.matchAll(fileWithExtRegex)].map(match => match[1]);
      if (explicitExtensions.length > 0) {
        console.log(`${YELLOW}⚠️  ${dir}/${file} has explicit file extensions in imports: ${explicitExtensions.slice(0, 3).join(', ')}${explicitExtensions.length > 3 ? ', ...' : ''}${RESET}`);
        pathIssueCount++;
      }
      
      // Check for relative imports that might need adjustments
      const relativeImports = [...content.matchAll(relativeImportRegex)].map(match => match[1]);
      if (relativeImports.length > 0 && !file.includes('test')) {
        // Only warn if this is not a test file (tests often use relative imports)
        console.log(`${YELLOW}⚠️  ${dir}/${file} has ${relativeImports.length} relative imports that may need path mapping${RESET}`);
      }
    }
  }
  
  if (pathIssueCount === 0) {
    console.log(`${GREEN}✅ No major path issues detected in sampled files${RESET}`);
  }
} catch (error) {
  console.log(`${RED}❌ Error checking path issues: ${error.message}${RESET}`);
}

// Try to detect the main error patterns
console.log(`\n${CYAN}Detecting common error patterns...${RESET}`);

try {
  // Run a quick type check and capture errors
  const typeCheckOutput = execSync('npx tsc --noEmit --skipLibCheck', { 
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'] 
  }).toString();
  
  console.log(`${GREEN}✅ No TypeScript errors detected!${RESET}`);
} catch (error) {
  // Analyze the error output
  const errorOutput = error.stdout || error.stderr || '';
  
  // Count common error types
  const errorCounts = {
    moduleNotFound: (errorOutput.match(/Cannot find module/g) || []).length,
    typeNotAssignable: (errorOutput.match(/Type .* is not assignable to type/g) || []).length,
    propertyMissing: (errorOutput.match(/Property .* does not exist on type/g) || []).length,
    importErrors: (errorOutput.match(/Relative import paths need explicit file extensions/g) || []).length,
    syntaxErrors: (errorOutput.match(/Syntax error/g) || []).length
  };
  
  const totalErrors = Object.values(errorCounts).reduce((sum, count) => sum + count, 0);
  
  console.log(`${RED}❌ Found ${totalErrors} TypeScript errors${RESET}`);
  console.log(`   - ${errorCounts.moduleNotFound} module not found errors`);
  console.log(`   - ${errorCounts.typeNotAssignable} type compatibility errors`);
  console.log(`   - ${errorCounts.propertyMissing} missing property errors`);
  console.log(`   - ${errorCounts.importErrors} import path errors`);
  console.log(`   - ${errorCounts.syntaxErrors} syntax errors`);
  
  // Recommend solutions based on error types
  console.log(`\n${MAGENTA}Recommended fixes:${RESET}`);
  
  if (errorCounts.importErrors > 0) {
    console.log(`${YELLOW}➡️  Run 'node scripts/fix-esm-imports.js' to fix import path issues${RESET}`);
  }
  
  if (errorCounts.moduleNotFound > 0) {
    console.log(`${YELLOW}➡️  Check the 'paths' configuration in tsconfig.base.json${RESET}`);
  }
  
  if (errorCounts.propertyMissing > 0) {
    console.log(`${YELLOW}➡️  Update type definitions in types.ts${RESET}`);
  }
}

// Check for Python requirements
console.log(`\n${CYAN}Checking Python environment...${RESET}`);

try {
  if (fs.existsSync(path.join(rootDir, 'mm_service', 'requirements.txt'))) {
    console.log(`${GREEN}✅ Python requirements.txt found${RESET}`);
    
    // Try to check if Python is installed
    try {
      execSync('python --version || python3 --version', { stdio: 'ignore' });
      console.log(`${GREEN}✅ Python is installed${RESET}`);
    } catch (error) {
      console.log(`${YELLOW}⚠️  Python is not installed or not in PATH${RESET}`);
    }
  } else {
    console.log(`${YELLOW}⚠️  Python requirements.txt not found${RESET}`);
  }
} catch (error) {
  console.log(`${RED}❌ Error checking Python environment: ${error.message}${RESET}`);
}

// Final summary and recommendations
console.log(`\n${BLUE}======================================${RESET}`);
console.log(`${BLUE}         DIAGNOSTIC SUMMARY           ${RESET}`);
console.log(`${BLUE}======================================${RESET}\n`);

console.log(`${CYAN}Next steps to fix multimodal system:${RESET}`);
console.log(`${GREEN}1. Run './scripts/multimodal-integration-fixed.sh' to set up integration${RESET}`);
console.log(`${GREEN}2. Run 'node scripts/fix-esm-imports.js' to fix import paths${RESET}`);
console.log(`${GREEN}3. Update 'types.ts' to address type compatibility issues${RESET}`);
console.log(`${GREEN}4. Run 'npm run build:multimodal' to build the entire system${RESET}`);
console.log(`${GREEN}5. Run './scripts/run-multimodal.sh' to start the system${RESET}`);

console.log(`\n${BLUE}======================================${RESET}`);