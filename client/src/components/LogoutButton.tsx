import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { authHelpers } from '@/lib/auth';

interface LogoutButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export default function LogoutButton({ 
  variant = 'outline', 
  size = 'sm', 
  className = '' 
}: LogoutButtonProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    authHelpers.logout();
    navigate('/', { replace: true });
  };

  return (
    <Button
      onClick={handleLogout}
      variant={variant}
      size={size}
      className={`${className}`}
    >
      <LogOut className="w-4 h-4 mr-2" />
      Logout
    </Button>
  );
}
