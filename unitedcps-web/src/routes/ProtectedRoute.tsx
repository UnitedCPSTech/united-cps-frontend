import { Navigate } from "react-router-dom";
import type { ReactElement } from "react";

type Props = {
  children: ReactElement;
  allowRoles?: string[];
};

export default function ProtectedRoute({ children, allowRoles }: Props) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) return <Navigate to="/" replace />;

  // If page requires roles, user must have a role and it must match
  if (allowRoles) {
    if (!role) return <Navigate to="/" replace />;
    if (!allowRoles.includes(role)) return <Navigate to="/engineer-redirect" replace />;
  }

  return children;
}