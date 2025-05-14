import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, makeCurrentUserAdmin } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';

type User = {
  id: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{user: any} | undefined>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const getUser = async () => {
      try {
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);
            if (session?.user) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
              });
              
              // Make user admin when they log in
              if (event === 'SIGNED_IN') {
                console.log('Making user admin after login');
                makeCurrentUserAdmin()
                  .then(success => {
                    if (success) {
                      console.log('User is now admin');
                    }
                  })
                  .catch(error => console.error('Error making user admin:', error));
              }
            } else {
              setUser(null);
              
              // Redirect to login if on a protected page and not already there
              const protectedPaths = ['/dashboard', '/user-management', '/employees', '/departments', '/job-history'];
              if (protectedPaths.some(path => location.pathname.startsWith(path))) {
                navigate('/login');
              }
            }
            setIsLoading(false);
          }
        );

        // THEN check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
          });
          
          // Make existing user admin
          console.log('Making existing user admin during session check');
          try {
            const success = await makeCurrentUserAdmin();
            if (success) {
              console.log('Existing user is now admin');
            }
          } catch (error) {
            console.error('Error making existing user admin:', error);
          }
          
          // Redirect to dashboard if on login page
          if (location.pathname === '/login') {
            navigate('/dashboard');
          }
        } else if (location.pathname !== '/login' && location.pathname !== '/signup') {
          // If no session and not on login/signup page, redirect to login
          navigate('/login');
        }
        
        setIsLoading(false);
        
        return () => {
          if (subscription) {
            subscription.unsubscribe();
          }
        };
      } catch (error) {
        console.error('Error getting user session:', error);
        setIsLoading(false);
      }
    };

    getUser();
  }, [navigate, location]);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
      
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error details:', error);
      toast({
        title: "Login failed",
        description: error.message || "Failed to sign in. Please check your credentials.",
        variant: "destructive",
      });
      throw error; // Re-throw to allow the login component to handle it
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      
      toast({
        title: "Account created!",
        description: "Please check your email for verification.",
      });
      
      // Return the user data so it can be used for setting roles
      return data;
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Logged out",
        description: "You've been successfully logged out."
      });
      
      navigate('/login');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
