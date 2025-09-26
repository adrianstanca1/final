import React from 'react';
import { User, View, Permission } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Tag } from '../ui/Tag';
import {
  evaluateViewAccess,
  getDefaultViewForUser,
  getViewDisplayName,
  ViewAccessEvaluation,
} from '../../utils/viewAccess';

interface ViewAccessBoundaryProps {
  user: User;
  view: View;
  evaluation?: ViewAccessEvaluation;
  fallbackView?: View;
  onNavigate?: (view: View) => void;
  children: React.ReactNode;
}

const humanise = (value: string): string =>
  value
    .split('_')
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(' ');

const PermissionRequirements: React.FC<{ 
  permissions: Permission[]; 
  anyGroups: Permission[][]; 
}> = ({ permissions, anyGroups }) => {
  const uniquePermissions = Array.from(new Set(permissions));
  const sanitizedAnyGroups = anyGroups
    .map((group) => Array.from(new Set(group)))
    .filter((group) => group.length > 0);

  if (uniquePermissions.length === 0 && sanitizedAnyGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {uniquePermissions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Requires all of
          </p>
          <div className="flex flex-wrap gap-2">
            {uniquePermissions.map((permission) => (
              <Tag 
                key={permission} 
                label={humanise(permission as string)} 
                color="red" 
                statusIndicator="red" 
              />
            ))}
          </div>
        </div>
      )}

      {sanitizedAnyGroups.map((group) => (
        <div key={`group-${group.join('-')}`} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Requires any of
          </p>
          <div className="flex flex-wrap gap-2">
            {group.map((permission) => (
              <Tag 
                key={permission} 
                label={humanise(permission as string)} 
                color="orange" 
                statusIndicator="orange" 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const AccessDenied: React.FC<{
  user: User;
  view: View;
  evaluation: ViewAccessEvaluation;
  fallbackView?: View;
  onNavigate?: (view: View) => void;
}> = ({ user, view, evaluation, fallbackView, onNavigate }) => {
  const viewName = getViewDisplayName(view);
  const defaultView = getDefaultViewForUser(user);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <Card className="max-w-lg text-center space-y-6">
        <div className="space-y-2">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Access Denied
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            You don't have permission to access the <strong>{viewName}</strong> view.
          </p>
        </div>

        {evaluation.missingPermissions.length > 0 || evaluation.missingPermissionGroups.length > 0 ? (
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              Required Permissions
            </h3>
            <PermissionRequirements 
              permissions={evaluation.missingPermissions} 
              anyGroups={evaluation.missingPermissionGroups} 
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your current role: <strong>{user.role}</strong>
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Contact your administrator to request access to this view.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          {fallbackView && onNavigate && (
            <Button
              onClick={() => onNavigate(fallbackView)}
              variant="outline"
            >
              Go to {getViewDisplayName(fallbackView)}
            </Button>
          )}
          {onNavigate && (
            <Button
              onClick={() => onNavigate(defaultView)}
            >
              Go to {getViewDisplayName(defaultView)}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export const ViewAccessBoundary: React.FC<ViewAccessBoundaryProps> = ({
  user,
  view,
  evaluation,
  fallbackView,
  onNavigate,
  children,
}) => {
  const actualEvaluation = evaluation || evaluateViewAccess(user, view);

  if (actualEvaluation.hasAccess) {
    return <>{children}</>;
  }

  return (
    <AccessDenied
      user={user}
      view={view}
      evaluation={actualEvaluation}
      fallbackView={fallbackView}
      onNavigate={onNavigate}
    />
  );
};