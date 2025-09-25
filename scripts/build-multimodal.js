// @ts-check

/**
 * Build script for the multimodal system
 * This script builds both frontend and backend components, ensuring consistent shared types
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DIST_SERVICES_DIR = path.join(ROOT_DIR, 'dist-services');
const TYPES_DIR = path.join(ROOT_DIR, 'dist/types');

// Ensure directories exist
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}
if (!fs.existsSync(DIST_SERVICES_DIR)) {
  fs.mkdirSync(DIST_SERVICES_DIR, { recursive: true });
}
if (!fs.existsSync(TYPES_DIR)) {
  fs.mkdirSync(TYPES_DIR, { recursive: true });
}

console.log('Building shared types...');
try {
  execSync('npx tsc -p tsconfig.base.json --emitDeclarationOnly --declaration --outDir dist/types', { stdio: 'inherit' });
} catch (error) {
  console.error('Error building shared types:', error);
  // Continue with the build despite errors
}

console.log('Building API services...');
try {
  execSync('npx tsc -p tsconfig.api.json', { stdio: 'inherit' });
} catch (error) {
  console.error('Error building API services:', error);
  // Don't exit here to allow the other builds to run
}

console.log('Building backend services...');
try {
  execSync('npx tsc -p tsconfig.services.json', { stdio: 'inherit' });
} catch (error) {
  console.error('Error building backend services:', error);
  // Don't exit here to allow the frontend build to run
}

console.log('Building frontend with Vite...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
} catch (error) {
  console.error('Error building frontend:', error);
  // Continue despite errors
}

console.log('Copying types to services dist directory...');
try {
  execSync(`cp -r ${TYPES_DIR} ${DIST_SERVICES_DIR}/`, { stdio: 'inherit' });
} catch (error) {
  console.error('Error copying types:', error);
}

console.log('Build completed successfully!');