# IONOS Hosting Deployment Guide

## IONOS Ultimate Hosting Setup

### Hosting Details
- **Provider**: IONOS Ultimate Hosting
- **Account**: adrian.stanca1@gmail.com
- **Domain**: (Your domain will be configured through IONOS)

### Deployment Method Options

#### Option 1: FTP/SFTP Upload (Recommended)

1. **Get your FTP credentials from IONOS:**
   - Log into your IONOS control panel
   - Go to "Hosting & Domains" 
   - Find your hosting package
   - Click on "Manage" → "FTP Access"
   - Note down:
     - FTP Server (usually: your-domain.com or ftp.ionos.com)
     - Username (usually your email or assigned username)
     - Password (the one you set)
     - Port (usually 21 for FTP or 22 for SFTP)

2. **Upload files:**
   - Navigate to your web root directory (usually `/` or `/htdocs/` or `/public_html/`)
   - Upload all files from the `dist/` folder
   - Make sure `index.html` is in the root directory

#### Option 2: File Manager (IONOS Control Panel)

1. Log into IONOS control panel
2. Go to "File Manager"
3. Navigate to your web root directory
4. Upload the contents of the `dist/` folder

### Files to Deploy

The build process creates these files in the `dist/` folder:
- `index.html` - Main application file

### Domain Configuration

1. **In IONOS Control Panel:**
   - Go to "Domains & SSL"
   - Configure your domain to point to the hosting package
   - Set up DNS records if needed

2. **SSL Certificate:**
   - IONOS usually provides free SSL certificates
   - Enable SSL in your hosting settings

### Environment Variables

For the full React app (when we fix the build issues), you'll need to configure:
- `VITE_GEMINI_API_KEY` - Your Google Gemini API key

### Deployment Commands

```bash
# Build the application
npm run build

# The files will be in the dist/ folder ready for upload
```

## Security Notes

1. **Change your IONOS password** immediately after this deployment
2. **Never share credentials** in chat logs or code repositories  
3. **Use SFTP instead of FTP** when possible for secure file transfer
4. **Enable two-factor authentication** in your IONOS account

## Next Steps

1. Deploy the simple version first to test the hosting
2. Fix the React app build issues
3. Deploy the full React application
4. Configure custom domain and SSL