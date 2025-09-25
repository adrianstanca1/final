import React from 'react';
import { User, Permission, View } from '../../types';
import { hasPermission } from '../../services/auth';
import { Card } from '../ui/Card';

interface ViewAccessBoundaryProps {
  user: User | null;
  view: View;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requiredPermissions?: Permission[];
  anyRequiredPermissions?: Permission[][];
}

const AccessDenied: React.FC = () => (
  <Card>
    <div className="p-6 text-center">
      <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
      <p className="text-gray-600">
        You don't have permission to view this section.
      </p>
    </div>
  </Card>
);

export const ViewAccessBoundary: React.FC<ViewAccessBoundaryProps> = ({
  user,
  view,
  children,
  fallback,
  requiredPermissions = [],
  anyRequiredPermissions = []
}) => {
  if (!user) {
    return fallback || <AccessDenied />;
  }

  // Check required permissions (all must be satisfied)
  const hasAllRequiredPermissions = requiredPermissions.every(permission =>
    hasPermission(user, permission)
  );

  // Check "any" permissions (at least one group must be fully satisfied)
  const hasAnyRequiredPermissions = anyRequiredPermissions.length === 0 ||
    anyRequiredPermissions.some(permissionGroup =>
      permissionGroup.every(permission => hasPermission(user, permission))
    );

  if (hasAllRequiredPermissions && hasAnyRequiredPermissions) {
    return <>{children}</>;
  }

  return fallback || <AccessDenied />;
};
