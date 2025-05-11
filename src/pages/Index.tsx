
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user, isLoading } = useAuth();
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-t-hrm-600 border-r-transparent border-b-hrm-600 border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  // Always redirect to dashboard if logged in, otherwise to login page
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
};

export default Index;
