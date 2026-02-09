import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ allowedRoles }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  // 1. Check if User is Logged In
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. Check if User has the Right Role (RBAC)
  // If allowedRoles is provided (e.g. ['admin']), check if user matches.
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    alert("Access Denied: You do not have permission to view this page.");
    return <Navigate to="/" replace />; // Send them to Dashboard
  }

  // 3. If all checks pass, render the child route (The actual page)
  return <Outlet />;
}