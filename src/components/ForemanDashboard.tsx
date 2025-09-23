import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import InviteQRPanel from './InviteQRPanel';
import { Role } from '../types';
// ... existing imports and component code above ...

// Ensure we export a default OR named export consistently, mirroring OwnerDashboard.tsx
// In OwnerDashboard.tsx, the fix was to define the component and export default at the end.

const ForemanDashboard: React.FC<any> = ({ user, addToast }) => {
  // component implementation remains unchanged
  return (
    <div className="space-y-6">
      <InviteQRPanel
        user={user}
        addToast={addToast}
        targetRoles={[Role.OPERATIVE]}
        title="Invite operatives via QR"
        description="Generate QR invites for operatives on site."
      />
    </div>
  );
};

export default ForemanDashboard;
