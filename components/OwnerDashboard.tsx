import React from "react";
import { User, Project, View } from "../types";

interface OwnerDashboardProps {
  user: User;
  addToast: (message: string, type: "success" | "error") => void;
  onSelectProject: (project: Project) => void;
  setActiveView?: (view: View) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  user
}) => {
  return (
    <div>
      <h1>Owner Dashboard</h1>
      <p>Welcome, {user.firstName}!</p>
    </div>
  );
};
