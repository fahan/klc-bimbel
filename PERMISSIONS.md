# Role-Based Access Control (RBAC) Implementation

## Overview

The KLC Bimbel system now includes comprehensive role-based access control that protects both frontend routes and backend API endpoints. Users can have multiple roles simultaneously, and the system checks if they have ANY of the required roles to access a feature.

## User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **OWNER** | System owner with full access | Complete system access |
| **ADMIN_GLOBAL** | Global administrator | Access to all features except branch-specific restrictions |
| **ADMIN_CABANG** | Branch administrator | Access to operational features for assigned branches |
| **GURU** | Teacher/Instructor | Limited access to attendance, schedule, and commission features |

## Frontend Permission System

### 1. Permission Configuration

All features and their required roles are defined in `lib/permissions.ts`:

```typescript
export const featurePermissions: PermissionConfig = {
  'master-data/branches': ['OWNER', 'ADMIN_GLOBAL'],
  'master-data/students': ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG'],
  'presensi': ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG', 'GURU'],
  'manajemen-user': ['OWNER', 'ADMIN_GLOBAL'],
  // ... more features
}
```

### 2. Permission Hook

Use the `usePermission()` hook in any component to check permissions:

```typescript
import { usePermission } from '@/lib/use-permissions'

export function MyComponent() {
  const { can, hasRole, hasAnyRole } = usePermission()

  // Check if user can access a specific feature
  if (can('master-data/branches')) {
    // Show content
  }

  // Check if user has a specific role
  if (hasRole('OWNER')) {
    // Show owner-only content
  }

  // Check if user has any of the provided roles
  if (hasAnyRole(['OWNER', 'ADMIN_GLOBAL'])) {
    // Show for admins
  }
}
```

### 3. Route Protection

Routes are automatically protected with `PermissionGuard` in the dashboard layout. If a user tries to access a route they don't have permission for:

1. They are redirected to `/dashboard`
2. A warning is logged to console
3. The user sees an "Access Denied" message

### 4. Menu Filtering

The sidebar automatically filters menu items based on user roles. Users only see navigation items they have permission to access.

**Example:** A GURU (teacher) will only see:
- Dashboard
- Presensi
- Jadwal & Sesi  
- Guru-specific pages

### 5. Component-Level Permission Controls

#### Using `PermissionButton`

Hide action buttons based on permissions:

```typescript
import { PermissionButton } from '@/components/ui/PermissionButton'

<PermissionButton requiredFeature="master-data/branches">
  <Plus className="w-4 h-4" />
  Add Branch
</PermissionButton>
```

#### Using `PermissionRequired`

Show/hide content sections based on permissions:

```typescript
import { PermissionRequired } from '@/components/ui/PermissionButton'

<PermissionRequired requiredFeature="manajemen-user">
  <UserManagementSection />
  <fallback>
    <p>You don't have permission to manage users</p>
  </fallback>
</PermissionRequired>
```

## Backend Permission System

### 1. Route Guards

All protected endpoints use `@UseGuards(JwtAuthGuard, RolesGuard)`:

```typescript
@Controller('users')
export class UsersController {
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')  // User needs one of these roles
  async findAll() {
    // ...
  }
}
```

### 2. Roles Decorator

The `@Roles()` decorator specifies which roles can access an endpoint:

```typescript
@Roles('OWNER')                    // Only OWNER
@Roles('OWNER', 'ADMIN_GLOBAL')    // Either OWNER or ADMIN_GLOBAL
```

### 3. Authorization Matrix

| Action | OWNER | ADMIN_GLOBAL | ADMIN_CABANG | GURU |
|--------|-------|--------------|--------------|------|
| Master Data CRUD | ✅ | ✅ | ✅ (own) | ❌ |
| Delete Branch | ✅ | ✅ | ❌ | ❌ |
| Generate Invoice | ✅ | ✅ | ✅ | ❌ |
| Submit Attendance | ✅ | ✅ | ✅ | ✅ (own) |
| View All Branches | ✅ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ✅ | ❌ | ❌ |

## Multi-Role Support

Users can now have multiple roles simultaneously:

### Assigning Multiple Roles

1. Go to **Manajemen Pengguna** (User Management)
2. Find the user
3. Click the **Edit** button (pencil icon)
4. In the "Kelola Peran Pengguna" modal:
   - View all current roles
   - Add new roles using the buttons
   - Remove roles (minimum 1 required)

### Example: Saras as Teacher + Branch Admin

- Saras has roles: `['GURU', 'ADMIN_CABANG']`
- She can access features allowed for BOTH roles:
  - GURU features: presensi, jadwal, komisi
  - ADMIN_CABANG features: master data, invoices, etc.

### JWT Payload with Multiple Roles

The JWT token now includes both the primary role and all roles:

```json
{
  "id": "user-id",
  "email": "saras@example.com",
  "role": "GURU",           // Primary role (backward compatible)
  "roles": ["GURU", "ADMIN_CABANG"],  // All roles
  "iat": 1620000000
}
```

## Adding New Features

### Step 1: Add to Permission Matrix

Update `lib/permissions.ts`:

```typescript
export const featurePermissions: PermissionConfig = {
  // ... existing features
  'my-new-feature': ['OWNER', 'ADMIN_GLOBAL'],
}
```

### Step 2: Protect the Route

The PermissionGuard will automatically protect routes matching the feature name.

### Step 3: Filter Menu Items

Add to sidebar menu sections in `Sidebar.tsx` and the PermissionGuard will filter them.

### Step 4: Add Backend Guards

```typescript
@Post('/my-endpoint')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN_GLOBAL')
async myEndpoint() {
  // ...
}
```

## Testing Permissions

### Test as GURU (Teacher)

1. Login with: `guru@bimbel.com / password`
2. Observe:
   - Limited menu (only Presensi, Jadwal, Dashboard)
   - Cannot access `/master-data/*` routes
   - Cannot access `/manajemen-user` route

### Test as ADMIN_CABANG (Branch Admin)

1. Login with: `admin@bimbel.com / password`
2. Observe:
   - More menu options than GURU
   - Can access master data and invoices
   - Cannot access `/transfer-stok` or `/manajemen-user`
   - Locked to single branch in branch switcher

### Test as OWNER

1. Login with: `owner@bimbel.com / password`
2. Observe:
   - Full menu access
   - Can access all features
   - Can switch between all branches
   - Can manage users and assign roles

### Test Multi-Role

1. Login as OWNER
2. Go to Manajemen Pengguna
3. Add additional role to a user (e.g., make GURU an ADMIN_CABANG too)
4. Login as that user
5. Observe: They can now access features from both roles

## Security Considerations

### Frontend Permission System

The frontend permission system provides:
- **UX Enhancement** - Users only see features they can access
- **First-line Defense** - Prevents accidental access to unauthorized features
- **Route Protection** - Automatic redirect if accessing unauthorized routes

⚠️ **Important**: Frontend permissions are NOT sufficient for security. Always enforce permissions on the backend.

### Backend Permission System

The backend permission system provides:
- **Security Enforcement** - Actual access control
- **Data Protection** - Prevents unauthorized data access/modification
- **API Protection** - All endpoints validate user roles

### Best Practices

1. **Always protect backend endpoints** with `@Roles()` decorator
2. **Never rely solely on frontend filtering** for sensitive operations
3. **Log permission denials** for security auditing
4. **Regularly audit role assignments** to ensure users have appropriate access
5. **Use minimum privilege principle** - assign only necessary roles

## Troubleshooting

### User Can't Access Expected Feature

1. Check if user has the required role in Manajemen Pengguna
2. Verify the feature is in `featurePermissions`
3. Check browser console for permission warnings
4. Test API endpoint directly with valid JWT token

### Menu Item Not Showing

1. Verify user has required role
2. Check if feature name matches route path
3. Clear browser cache and localStorage
4. Reload the page

### API Returns 403 Forbidden

1. Check if user has required role
2. Verify endpoint has `@Roles()` decorator
3. Check JWT token in Authorization header
4. Test with OWNER account to confirm backend is working

## Future Enhancements

- [ ] Permission-based feature flags (enable/disable features globally)
- [ ] Custom role creation
- [ ] Role templates for common scenarios
- [ ] Audit logging for permission checks
- [ ] Time-based role assignments (e.g., temporary admin)
- [ ] Granular permission system (beyond role-based)
