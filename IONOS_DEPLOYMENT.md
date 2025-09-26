# IONOS Deployment Guide

This guide explains how to deploy the Construction Management App to IONOS hosting.

## Prerequisites

1. IONOS hosting account with FTP/SFTP access
2. Node.js 18+ installed locally
3. Build dependencies installed (`npm ci`)

## Deployment Methods

### Method 1: Automated FTP Deployment

Set up your IONOS FTP credentials as environment variables:

```bash
export IONOS_FTP_HOST="your-domain.com"
export IONOS_FTP_USER="your-ftp-username"
export IONOS_FTP_PASS="your-ftp-password"
```

Then deploy:

```bash
# Production deployment to IONOS
npm run deploy:ionos

# Dry run to test configuration
npm run deploy:ionos-dry
```

### Method 2: Manual Upload

If you prefer manual deployment or don't have FTP access configured:

1. Build the application:
```bash
npm run build
```

2. Upload the contents of the `dist/` folder to your IONOS web root directory (usually `htdocs/` or `public_html/`)

3. Ensure the `.htaccess` file is uploaded for proper SPA routing

## Generated Files

The deployment process creates:

- **Built application**: All files in the `dist/` directory
- **.htaccess**: Apache configuration for SPA routing and security headers
- **Optimized assets**: Minified JS, CSS, and compressed images

## Security Features

The deployment includes:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection headers
- Long-term caching for static assets (1 year)
- Short-term caching for HTML files (1 day)

## Troubleshooting

### SPA Routing Issues
If direct URL access doesn't work, ensure the `.htaccess` file is in your web root and your hosting supports URL rewriting.

### Asset Loading Issues
Check that all files in the `dist/assets/` folder are uploaded and accessible.

### Environment Variables
Create a `.env.production` file for production-specific environment variables:

```
VITE_GEMINI_API_KEY=your-api-key-here
VITE_API_BASE_URL=https://your-domain.com/api
```

## Performance Optimization

The deployment automatically:
- Minifies JavaScript and CSS
- Optimizes images
- Implements aggressive caching headers
- Creates efficient code splitting

## Support

For deployment issues, check:
1. IONOS hosting documentation
2. FTP/SFTP connection settings
3. File permissions on uploaded files
4. Apache mod_rewrite availability