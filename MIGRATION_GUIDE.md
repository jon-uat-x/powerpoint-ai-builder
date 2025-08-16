# Supabase Migration Implementation Guide

## Overview
This guide provides step-by-step instructions for migrating from local file storage to Supabase.

## Prerequisites

1. **Supabase Project Setup**
   - Ensure your Supabase project is created at [supabase.com](https://supabase.com)
   - Project URL: `https://pjsjsynibeltjpusfald.supabase.co`
   - Obtain your `anon` and `service` keys from project settings

2. **Environment Variables**
   Create `.env` files in both client and server directories:

   **server/.env**
   ```env
   SUPABASE_URL=https://pjsjsynibeltjpusfald.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_KEY=your_service_key_here
   ```

   **client/.env**
   ```env
   VITE_SUPABASE_URL=https://pjsjsynibeltjpusfald.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

## Phase 1: Database Setup (Immediate)

### 1.1 Deploy Database Schema

1. **Remove read-only mode from .mcp.json**:
   ```json
   {
     "mcpServers": {
       "supabase": {
         "command": "cmd",
         "args": [
           "/c",
           "npx",
           "-y",
           "@supabase/mcp-server-supabase@latest",
           "--project-ref=pjsjsynibeltjpusfald"
         ],
         "env": {
           "SUPABASE_ACCESS_TOKEN": "your_access_token"
         }
       }
     }
   }
   ```

2. **Apply the migration**:
   ```bash
   # Option 1: Through Supabase Dashboard
   # Go to SQL Editor and paste contents of supabase/migrations/001_initial_schema.sql
   
   # Option 2: Using Supabase CLI
   npx supabase db push
   ```

3. **Verify schema deployment**:
   - Check tables exist in Supabase Dashboard
   - Verify RLS policies are enabled

### 1.2 Install Dependencies

```bash
# Server dependencies
cd server
npm install @supabase/supabase-js dotenv

# Client dependencies
cd ../client
npm install @supabase/supabase-js
```

## Phase 2: Data Migration

### 2.1 Backup Existing Data
```bash
# Create backup directory
mkdir backups
cp -r server/src/data backups/data_$(date +%Y%m%d_%H%M%S)
```

### 2.2 Run Migration Script

```bash
# Dry run first to preview
node scripts/migrate-to-supabase.js --dry-run --verbose

# If everything looks good, run actual migration
node scripts/migrate-to-supabase.js --verbose
```

### 2.3 Verify Migration
- Check Supabase Dashboard for migrated data
- Verify pitchbooks, sections, and slides are present
- Test data integrity

## Phase 3: Backend Integration

### 3.1 Update Server Configuration

1. **Update server/src/index.js** to use Supabase middleware:
   ```javascript
   const { supabase } = require('./services/database/supabaseClient');
   const authMiddleware = require('./middleware/auth');
   
   // Add auth middleware
   app.use('/api', authMiddleware);
   ```

2. **Create auth middleware** (`server/src/middleware/auth.js`):
   ```javascript
   const { getUserFromRequest } = require('../services/database/supabaseClient');
   
   module.exports = async (req, res, next) => {
     try {
       const user = await getUserFromRequest(req);
       req.user = user;
       next();
     } catch (error) {
       res.status(401).json({ error: 'Unauthorized' });
     }
   };
   ```

3. **Update route handlers** to use Supabase services:
   ```javascript
   // Example: server/src/routes/pitchbooks.js
   const pitchbookService = require('../services/database/pitchbookService');
   
   router.get('/', async (req, res) => {
     try {
       const token = req.headers.authorization?.replace('Bearer ', '');
       const pitchbooks = await pitchbookService.getAllForUser(token);
       res.json({ success: true, pitchbooks });
     } catch (error) {
       res.status(500).json({ success: false, error: error.message });
     }
   });
   ```

## Phase 4: Frontend Integration

### 4.1 Add Authentication

1. **Wrap App with AuthProvider**:
   ```javascript
   // client/src/main.jsx
   import { AuthProvider } from './contexts/AuthContext';
   
   root.render(
     <React.StrictMode>
       <AuthProvider>
         <PitchbookProvider>
           <App />
         </PitchbookProvider>
       </AuthProvider>
     </React.StrictMode>
   );
   ```

2. **Create Login Component**:
   ```javascript
   // client/src/components/auth/LoginForm.jsx
   import { useAuth } from '../../contexts/AuthContext';
   
   const LoginForm = () => {
     const { login } = useAuth();
     // Implementation...
   };
   ```

3. **Add Protected Routes**:
   ```javascript
   // client/src/components/auth/ProtectedRoute.jsx
   import { Navigate } from 'react-router-dom';
   import { useAuth } from '../../contexts/AuthContext';
   
   const ProtectedRoute = ({ children }) => {
     const { isAuthenticated, loading } = useAuth();
     
     if (loading) return <div>Loading...</div>;
     if (!isAuthenticated) return <Navigate to="/login" />;
     
     return children;
   };
   ```

### 4.2 Update PitchbookContext

Replace API calls with Supabase client:

```javascript
// client/src/contexts/PitchbookContext.jsx
import { db } from '../lib/supabase';

const loadPitchbooks = useCallback(async () => {
  try {
    setLoading(true);
    const pitchbooks = await db.pitchbooks.getAll();
    setPitchbooks(pitchbooks);
  } catch (err) {
    setError('Failed to load pitchbooks');
  } finally {
    setLoading(false);
  }
}, []);
```

## Phase 5: Real-time Features

### 5.1 Enable Real-time Subscriptions

```javascript
// client/src/pages/EditPitchbook.jsx
import { subscribeToPitchbook, unsubscribeFromChannel } from '../lib/supabase';

useEffect(() => {
  const channel = subscribeToPitchbook(pitchbookId, {
    onPitchbookChange: (payload) => {
      console.log('Pitchbook updated:', payload);
      // Update local state
    },
    onSlidesChange: (payload) => {
      console.log('Slides updated:', payload);
      // Update local state
    },
    onPresenceSync: () => {
      const state = getPresenceState(channel);
      // Update collaborators list
    }
  });
  
  return () => {
    unsubscribeFromChannel(channel);
  };
}, [pitchbookId]);
```

## Testing Checklist

### Basic Functionality
- [ ] User can sign up and log in
- [ ] User can create a new pitchbook
- [ ] User can view list of pitchbooks
- [ ] User can edit pitchbook prompts
- [ ] User can delete pitchbooks
- [ ] Data persists after page refresh

### Supabase Integration
- [ ] Authentication works correctly
- [ ] RLS policies prevent unauthorized access
- [ ] Real-time updates work
- [ ] Database queries are performant
- [ ] Error handling works properly

### Migration Verification
- [ ] All existing pitchbooks migrated
- [ ] All sections and slides preserved
- [ ] All prompts maintained
- [ ] No data loss occurred

## Rollback Plan

If issues occur during migration:

1. **Restore from backup**:
   ```bash
   cp -r backups/data_[timestamp] server/src/data
   ```

2. **Revert code changes**:
   ```bash
   git checkout main
   ```

3. **Clear Supabase data** (if needed):
   ```sql
   -- Run in Supabase SQL Editor
   TRUNCATE pitchbooks CASCADE;
   TRUNCATE organizations CASCADE;
   ```

## Performance Optimization

### Database Indexes
Already created in migration, but verify they exist:
- `idx_pitchbooks_org`
- `idx_slides_pitchbook`
- `idx_placeholder_slide`

### Query Optimization
- Use `select()` with specific columns
- Implement pagination for large datasets
- Use Supabase's query builder efficiently

### Caching Strategy
- Implement React Query or SWR for client-side caching
- Use Supabase's built-in caching headers
- Cache static data like templates

## Monitoring

### Set up monitoring for:
- Database performance (Supabase Dashboard)
- API response times
- Error rates
- User authentication events
- Real-time connection stability

## Next Steps

1. **Complete Phase 1-2** immediately (Database setup and data migration)
2. **Test in development** environment thoroughly
3. **Deploy Phase 3-4** (Backend and frontend integration)
4. **Enable real-time features** (Phase 5)
5. **Monitor and optimize** based on usage patterns

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   - Ensure user is authenticated
   - Check policy conditions
   - Use service key for admin operations

2. **Migration Failures**
   - Check for unique constraint violations
   - Verify foreign key relationships
   - Ensure proper data types

3. **Real-time Not Working**
   - Enable replication for tables
   - Check WebSocket connection
   - Verify subscription syntax

4. **Authentication Issues**
   - Verify environment variables
   - Check token expiration
   - Ensure proper CORS configuration