# Authentication System Documentation

This application now supports **multiple authentication backends** that can be configured based on your needs:

1. **Firebase Authentication** (Google OAuth + Email/Password)
2. **Supabase Authentication** (Already configured)
3. **Mock Authentication** (Development fallback)

## Current Status ✅

The page crashes have been **RESOLVED** with the following fixes:

- ✅ **Firebase Authentication** - Complete Google OAuth & email/password implementation
- ✅ **Dual Authentication System** - Works with Firebase OR Supabase
- ✅ **Automatic Fallback** - Falls back to mock auth if neither is configured
- ✅ **Existing UI Integration** - Works with current AuthContext and components
- ✅ **User & Company Management** - Automatic document creation in Firestore
- ✅ **Production Ready** - Environment-based configuration

## Quick Start Options

### Option 1: Use Firebase Authentication (Recommended for New Projects)

1. **Follow the Firebase setup guide**: See `FIREBASE_SETUP.md` for detailed instructions

2. **Configure environment variables** in `.env.local`:
```bash
# Comment out Supabase and enable Firebase
# VITE_USE_SUPABASE_AUTH=true

# Uncomment and configure Firebase
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

3. **Start the application**: `npm run dev`

### Option 2: Continue Using Supabase (Current Configuration)

The app will continue working with the existing Supabase configuration. No changes needed.

### Option 3: Use Mock Authentication (Development)

If neither Firebase nor Supabase is configured, the app automatically falls back to mock authentication for development.

## Authentication Features

| Feature | Firebase | Supabase | Mock |
|---------|----------|----------|------|
| Email/Password Login | ✅ | ✅ | ✅ |
| Google OAuth | ✅ | ✅ | ❌ |
| Password Reset | ✅ | ✅ | ✅ |
| User Registration | ✅ | ✅ | ✅ |
| Company Creation | ✅ | ✅ | ✅ |
| Session Management | ✅ | ✅ | ✅ |
| Multi-Factor Auth | ❌ | ✅ | ✅ |
| Production Ready | ✅ | ✅ | ❌ |

## Implementation Details

### Firebase Implementation
- **Service**: `services/firebaseAuthClient.ts`
- **Configuration**: `services/firebase.ts`
- **UI Components**: `components/FirebaseLogin.tsx`
- **Features**: Google OAuth, Firestore integration, automatic user/company creation

### Architecture
- **AuthClient**: `services/authClient.ts` - Unified interface that automatically chooses Firebase or Supabase
- **AuthContext**: `contexts/AuthContext.tsx` - React context that works with any backend
- **Automatic Detection**: Checks for Firebase config first, falls back to Supabase, then mock

### Google OAuth Integration
The Firebase implementation includes a prominent Google OAuth button that:
- Creates user accounts automatically on first login
- Sets up company documents in Firestore
- Integrates seamlessly with existing authorization system
- Works with the existing UI components and styling

## Development vs Production

### Development
- Mock authentication works without any configuration
- Hot reloading and development features enabled
- Test users and data automatically generated

### Production
- Choose Firebase OR Supabase based on your requirements
- Set up proper environment variables in your deployment platform
- Configure proper security rules in your chosen backend

## Migration Guide

### From Supabase to Firebase
1. Export your existing user data from Supabase
2. Set up Firebase project following `FIREBASE_SETUP.md`
3. Import users to Firebase (optional)
4. Update environment variables
5. Deploy with new configuration

### From Mock to Production
1. Choose Firebase or Supabase
2. Follow the respective setup guides
3. Configure environment variables
4. Test authentication flows
5. Deploy to production

## Troubleshooting

### Page Crashes
The original page crashes have been resolved. If you experience issues:

1. Check browser console for errors
2. Verify environment variables are set correctly
3. Ensure Firebase/Supabase projects are configured properly
4. Check network connectivity to authentication services

### Authentication Errors
- **"Firebase not configured"**: Add Firebase environment variables
- **"Supabase connection failed"**: Check Supabase URL and keys
- **Google OAuth popup blocked**: Enable popups in browser settings

### Development Issues
- **Port conflicts**: The app automatically finds available ports
- **Module not found**: Run `npm install` to ensure all dependencies are installed
- **Build errors**: Check that all environment variables are properly formatted

## Support

- **Firebase Setup**: See `FIREBASE_SETUP.md`
- **API Documentation**: Check `services/` directory for implementation details
- **UI Components**: Located in `components/auth/` and `components/ui/`

The authentication system is now robust, flexible, and production-ready with multiple backend options to suit different deployment scenarios.