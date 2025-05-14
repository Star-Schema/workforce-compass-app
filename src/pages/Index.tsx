
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { makeCurrentUserAdmin } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  
  // Try to set current user as admin on app load
  useEffect(() => {
    if (user) {
      console.log("Attempting to make current user admin on app load");
      makeCurrentUserAdmin()
        .then(success => {
          if (success) {
            console.log("Successfully set current user as admin");
            toast({
              title: "Admin Status",
              description: "You have been granted admin privileges"
            });
          }
        })
        .catch(err => {
          console.error("Error setting current user as admin:", err);
        });
    }
  }, [user]);
  
  // If user isn't logged in, redirect to login page
  if (!isLoading && !user) {
    return <Navigate to="/login" replace />;
  }
  
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
  
  // Fallback to dashboard if logged in
  return <Navigate to="/dashboard" replace />;
};

export default Index;
