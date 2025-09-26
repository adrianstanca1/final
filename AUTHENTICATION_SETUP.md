# Development Configuration Guide

## Authentication Mode Configuration

The app supports two authentication modes:

### Mock Authentication (Default)
- Uses in-memory mock API
- No real database required
- Good for development and testing UI
- Set `VITE_USE_SUPABASE_AUTH=false` or omit the variable

### Supabase Authentication (Production Ready)
- Uses real Supabase database and auth
- Requires proper database schema setup
- Full production functionality
- Set `VITE_USE_SUPABASE_AUTH=true`

## Environment Variables

Add to your `.env.local` file:

```
# Supabase Configuration
VITE_SUPABASE_URL=https://qglvhxkgbzujglehewsa.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_SUPABASE_SERVICE_KEY=your_service_key_here

# Authentication Mode
VITE_USE_SUPABASE_AUTH=true

# AI Configuration (optional)
VITE_GEMINI_API_KEY=your_gemini_api_key
```

## Switching Between Modes

1. **To use Mock Authentication:**
   - Set `VITE_USE_SUPABASE_AUTH=false`
   - Restart dev server: `npm run dev`

2. **To use Supabase Authentication:**
   - Ensure database schema is applied (see DATABASE_SETUP.md)
   - Set `VITE_USE_SUPABASE_AUTH=true`
   - Restart dev server: `npm run dev`

## Migration Strategy

1. ✅ **Phase 1**: Database schema created
2. ✅ **Phase 2**: Supabase auth service implemented
3. 🚧 **Phase 3**: Registration flow updated
4. ⏳ **Phase 4**: Replace mock API calls
5. ⏳ **Phase 5**: Production deployment

The app can run in either mode, allowing for gradual migration and testing.