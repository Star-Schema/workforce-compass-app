
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { makeHardcodedEmailAdmin } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import MakeAdminSection from '@/components/MakeAdminSection';

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
  
  // If user is logged in but we're not redirecting, show make admin component for ramoel.bello5@gmail.com
  if (user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-xl">
          <h1 className="text-3xl font-bold mb-6 text-center">HR System Admin Setup</h1>
          <MakeAdminSection email="ramoel.bello5@gmail.com" onSuccess={() => toast({
            title: "Success",
            description: "Admin user has been configured. You can now use the system."
          })} />
          <div className="mt-6 text-center">
            <Navigate to="/dashboard" replace />
          </div>
        </div>
      </div>
    );
  }
  
  // Fallback to dashboard if logged in
  return <Navigate to="/dashboard" replace />;
};

export default Index;
