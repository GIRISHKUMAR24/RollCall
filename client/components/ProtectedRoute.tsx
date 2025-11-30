import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authHelpers } from '@/lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: 'student' | 'teacher' | 'principal';
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      // Check if user is authenticated
      if (!authHelpers.isLoggedIn()) {
        navigate('/', { replace: true });
        return;
      }

      // Check if user has the correct role
      if (allowedRole) {
        const userRole = authHelpers.getUserRole();
        if (userRole !== allowedRole) {
          // Redirect to their correct dashboard or login
          if (userRole) {
            navigate(`/${userRole}-dashboard`, { replace: true });
          } else {
            navigate('/', { replace: true });
          }
          return;
        }
      }
    };

    checkAuth();
  }, [navigate, allowedRole]);

  // Check authentication before rendering
  if (!authHelpers.isLoggedIn()) {
    return null; // Will redirect
  }

  // Check role if specified
  if (allowedRole && authHelpers.getUserRole() !== allowedRole) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
