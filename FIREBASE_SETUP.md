# Firebase Authentication Setup Guide

This app now supports Firebase Authentication with Google OAuth. Follow these steps to set it up:

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter your project name (e.g., "construction-management-app")
4. Disable Google Analytics if not needed
5. Click "Create project"

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" 
5. Enable "Google" as a sign-in provider
6. Add your project domains to authorized domains

## 3. Create Web App

1. Go to Project Overview (gear icon → Project settings)
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to add a Firebase web app
4. Register your app with a nickname (e.g., "Construction Management Web")
5. Copy the config object that appears

## 4. Configure Environment Variables

Create `.env.local` file in your project root:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Optional: Google Gemini API for AI features
VITE_GEMINI_API_KEY=your_gemini_key_here
```

## 5. Setup Firestore Database

1. Go to "Firestore Database" in Firebase Console
2. Click "Create database"
3. Choose "Start in test mode" (you can secure it later)
4. Select a location near your users
5. Click "Done"

## 6. Configure Security Rules (Optional but Recommended)

In Firestore, go to "Rules" tab and update:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read/write companies they belong to
    match /companies/{companyId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId == companyId;
    }
  }
}
```

## 7. Test the Setup

1. Run `npm run dev`
2. Try logging in with Google OAuth
3. Try creating an account with email/password
4. Check Firebase Console → Authentication → Users to see registered users
5. Check Firestore → Data to see user and company documents

## Features Included

- ✅ Google OAuth Login
- ✅ Email/Password Authentication  
- ✅ User Registration with Company Creation
- ✅ Password Reset via Email
- ✅ Automatic User & Company Document Creation
- ✅ Integration with Existing AuthContext
- ✅ Fallback to Mock Auth if Firebase not configured

## Deployment Configuration

### Vercel
Add environment variables in Vercel dashboard → Project Settings → Environment Variables

### Netlify
Add environment variables in Netlify dashboard → Site Settings → Build & Deploy → Environment Variables

### Other Platforms
Ensure all `VITE_FIREBASE_*` environment variables are set in your deployment platform.

## Troubleshooting

**Error: "Firebase: Error (auth/operation-not-allowed)"**
- Enable Email/Password and Google sign-in methods in Firebase Console

**Error: "Firebase: Error (auth/unauthorized-domain)"**
- Add your domain to authorized domains in Firebase Console → Authentication → Settings

**Error: "Firebase: Error (auth/api-key-not-valid)"**
- Double-check your API key in .env.local

**Google OAuth popup blocked**
- Ensure popups are enabled in browser
- Check that your domain is authorized in Firebase Console

**Users not appearing in Firestore**
- Check Firestore security rules
- Verify database creation completed successfully

For more help, check [Firebase Documentation](https://firebase.google.com/docs/auth)