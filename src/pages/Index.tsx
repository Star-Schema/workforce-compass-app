
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { makeHardcodedEmailAdmin } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  
  // Try to set the hardcoded email as admin on app load
  useEffect(() => {
    if (user) {
      console.log("Attempting to make hardcoded email admin on app load");
      makeHardcodedEmailAdmin()
        .then(success => {
          if (success) {
            console.log("Successfully set hardcoded email as admin");
            toast({
              title: "Admin User Set",
              description: "ramoel.bello5@gmail.com has been set as admin"
            });
          } else {
            console.log("Email was not found or couldn't be set as admin");
          }
        })
        .catch(err => {
          console.error("Error setting hardcoded email as admin:", err);
        });
    }
  }, [user]);
  
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
