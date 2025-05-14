
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

// Function to verify or check that the is_admin function exists
// We're not creating a function, just checking one exists
export const checkIsAdminFunction = async () => {
  try {
    const { error } = await supabase.rpc('is_admin');
    if (error) {
      console.error("Error checking is_admin function:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error checking is_admin function:", error);
    return false;
  }
};

// Get all users from auth table and join with user_roles
export const getAllUsers = async () => {
  try {
    console.log("Fetching all users");
    
    // Get current session user for basic information
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Make sure the current user is admin
    await makeCurrentUserAdmin();
    
    // Attempt to get all users from the auth.users table via the admin API
    // Since we don't have direct access to the admin API, we'll rely on the auth.users() data
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    // Get user roles data
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

    let usersWithRoles = [];
    
    if (authError || !authUsers) {
      console.error("Error fetching auth users:", authError);
      console.log("Falling back to session user only");
      
      // Add current user as a fallback
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
    } else {
      // Map auth users to our required format
      usersWithRoles = authUsers.users.map(authUser => ({
        id: authUser.id,
        email: authUser.email || authUser.id,
        role: roleMap.get(authUser.id) || 'user',
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at
      }));
    }
    
    console.log(`Found ${usersWithRoles.length} users`);
    return usersWithRoles;
  } catch (error) {
    console.error("Error fetching all users:", error);
    throw error;
  }
};

// Create a new user by admin (without password)
export const createUserByAdmin = async (email: string, role: UserRole) => {
  try {
    // Create a user_role first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Not authenticated");
    }
    
    // Generate a random password - the user will need to use "forgot password" to set their own
    const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
    
    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password: tempPassword,
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
    console.error("Error creating user by admin:", error);
    throw error;
  }
};

// Create a new user with password
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
