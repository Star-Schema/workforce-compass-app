
import { createClient } from '@supabase/supabase-js';
import { supabase as integrationSupabase } from '@/integrations/supabase/client';

// We'll reexport the auto-generated supabase client from the integration
// This ensures we're using only one client instance throughout the application
export const supabase = integrationSupabase;

// Export a helper function to check if we're using real credentials
export const hasValidCredentials = async () => {
  try {
    // Attempt a simple query to check connection
    console.log("Checking Supabase credentials...");
    const { data, error } = await supabase.from('user_roles').select('id').limit(1);
    
    if (error) {
      console.error("Supabase credential check failed:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Supabase credential check failed:", error);
    return false;
  }
};

// Helper function to handle Supabase errors consistently
export const handleSupabaseError = (error: any, fallbackMessage = "An error occurred") => {
  console.error("Supabase error:", error);
  
  // Return a user-friendly error message
  if (error?.code === "PGRST301") {
    return "You don't have permission to access this resource. Please make sure you're logged in with the correct account.";
  }
  
  if (error?.message?.includes("infinite recursion")) {
    return "A database policy error occurred. Please contact the system administrator.";
  }
  
  return error?.message || fallbackMessage;
};

// Check if user has a specific role using the security definer function we created
export const hasRole = async (userId: string, role: string): Promise<boolean> => {
  try {
    if (!userId) return false;
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error("Error checking role:", error);
      return false;
    }
    
    return data?.role === role;
  } catch (error) {
    console.error("Error in hasRole:", error);
    return false;
  }
};

// Check if current user is an admin
export const isAdmin = async (): Promise<boolean> => {
  try {
    // Use the is_admin security definer function to avoid recursion issues
    const { data, error } = await supabase.rpc('is_admin');
    
    if (error) {
      console.error("Error in isAdmin:", error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Error in isAdmin:", error);
    return false;
  }
};

// New function to fetch all Supabase users for admin purposes
export const getAllUsers = async () => {
  try {
    // First confirm user is an admin
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      throw new Error("You don't have permission to access user data");
    }
    
    // Get users from auth.users through the admin API
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      throw userError;
    }

    // Get roles from user_roles table
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');
    
    if (rolesError) {
      throw rolesError;
    }
    
    // Combine the data
    const usersWithRoles = userData.users.map(user => {
      const userRole = rolesData?.find(role => role.user_id === user.id);
      return {
        id: user.id,
        email: user.email,
        role: userRole?.role || 'user', // Default to 'user' if no role found
        created_at: user.created_at
      };
    });
    
    return usersWithRoles;
  } catch (error) {
    console.error("Error fetching all users:", error);
    throw error;
  }
};


