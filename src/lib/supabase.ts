
import { createClient } from '@supabase/supabase-js';
import { supabase as integrationSupabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/database';

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

  if (error?.message?.includes("not_admin")) {
    return "You don't have admin privileges to perform this action.";
  }
  
  return error?.message || fallbackMessage;
};

// Check if user has a specific role using the user_roles table
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

// Check if current user is an admin using our security definer function
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

// Make current user an admin
export const makeCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error("Error getting current user:", userError);
      return false;
    }

    console.log("Making user an admin:", userData.user.id);
    
    // Insert or update the current user's role to admin
    const { error } = await supabase
      .from('user_roles')
      .upsert({ 
        user_id: userData.user.id,
        role: 'admin',
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error("Error setting admin role:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error making current user admin:", error);
    return false;
  }
};

// Get all users from auth.users table and join with user_roles
export const getAllUsers = async () => {
  try {
    console.log("Fetching all users");
    
    // Get current session user for basic information
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get user data directly from auth table metadata
    // We'll use the only endpoint we have access to as regular users
    const { data: authSession, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error("Error fetching auth session:", authError);
      throw authError;
    }

    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');
    
    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
    }

    // Create a map of user_id to role
    const roleMap = new Map();
    if (rolesData) {
      rolesData.forEach(item => {
        roleMap.set(item.user_id, item.role);
      });
    }

    // Since we can't access the auth.users table directly without admin API key,
    // We'll at least ensure the current user is in our list
    const usersWithRoles = [];
    
    // Add current user
    if (user) {
      usersWithRoles.push({
        id: user.id,
        email: user.email || user.id,
        role: roleMap.get(user.id) || 'user',
        created_at: user.created_at || new Date().toISOString(),
        last_sign_in_at: user.last_sign_in_at
      });
      
      // Make current user an admin if not already
      if (!roleMap.has(user.id)) {
        await makeCurrentUserAdmin();
      }
    }
    
    console.log(`Found ${usersWithRoles.length} users`);
    return usersWithRoles;
  } catch (error) {
    console.error("Error fetching all users:", error);
    throw error;
  }
};

// Create a new user
export const createUser = async (email: string, password: string, role: UserRole) => {
  try {
    // Sign up the user through standard auth API
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error("Failed to create user");
    }

    // Set the user's role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({ 
        user_id: data.user.id, 
        role
      });

    if (roleError) {
      throw roleError;
    }

    return data.user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

