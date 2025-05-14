import { createClient } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'user' | 'blocked';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to check if the current user is an admin
export const isAdmin = async (): Promise<boolean> => {
  try {
    const { data: user, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Error fetching user:", authError);
      return false;
    }
    
    const userId = user.user.id;
    
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    if (rolesError) {
      console.error("Error fetching user role:", rolesError);
      return false;
    }
    
    return roles?.role === 'admin';
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

// Function to handle Supabase errors and return a user-friendly message
export const handleSupabaseError = (error: any): string => {
  if (error && error.message) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else {
    return "An unexpected error occurred.";
  }
};

// Function to get all users
export const getAllUsers = async (): Promise<any[]> => {
  try {
    const { data: users, error: authError } = await supabase
      .from('user_roles')
      .select('*');
    
    if (authError) {
      console.error("Error fetching users:", authError);
      throw authError;
    }
    
    // Fetch user details from auth.users using supabase.auth.admin.listUsers()
    const { data: authUsersData, error: authUsersError } = await supabase.auth.admin.listUsers();
    
    if (authUsersError) {
      console.error("Error fetching auth users:", authUsersError);
      throw authUsersError;
    }
    
    const authUsers = authUsersData?.users || [];
    
    // Combine roles data with user details
    const combinedUsers = users.map(user => {
      const authUser = authUsers.find(au => au.id === user.user_id);
      return {
        id: user.user_id,
        email: authUser?.email || 'N/A',
        role: user.role,
        created_at: authUser?.created_at || 'N/A',
        last_sign_in_at: authUser?.last_sign_in_at
      };
    });
    
    return combinedUsers;
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
};

// Function to create a new user by admin
export const createUserByAdmin = async (email: string, role: UserRole): Promise<any> => {
  try {
    // Create user with no password (admin bypass)
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: email,
      user_metadata: { role: role }
    });
    
    if (userError) {
      console.error("Error creating user:", userError);
      throw userError;
    }
    
    if (newUser && newUser.user?.id) {
      // Insert user role into the user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{ 
          user_id: newUser.user.id, 
          role: role 
        }]);
      
      if (roleError) {
        console.error("Error setting user role:", roleError);
        // Optionally, delete the user if role creation fails
        await supabase.auth.admin.deleteUser(newUser.user.id);
        throw roleError;
      }
      
      return newUser;
    } else {
      throw new Error("Failed to create user.");
    }
  } catch (error) {
    console.error("Error creating user by admin:", error);
    throw error;
  }
};

export const checkIsAdminFunction = async () => {
  const { data, error } = await supabase.functions.invoke('is-admin');
  
  if (error) {
    console.error("Error invoking is-admin function:", error);
    return false;
  }
  
  return data.isAdmin === true;
};

// Make a hardcoded email address an admin
export const makeHardcodedEmailAdmin = async (): Promise<boolean> => {
  try {
    // Get all users
    const { data: users, error: authError } = await supabase
      .from('user_roles')
      .select('*');
    
    if (authError || !users) {
      console.error("Error fetching users:", authError);
      return false;
    }
    
    // Find user with specific email
    const targetEmail = "ramoel.bello5@gmail.com";
    
    // Get user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError || !userData?.users) {
      console.error("Error fetching user by email:", userError);
      return false;
    }
    
    const user = userData.users.find(u => u.email === targetEmail);
    
    if (!user) {
      console.error(`User with email ${targetEmail} not found`);
      return false;
    }
    
    console.log(`Making user ${targetEmail} an admin`);
    
    // Insert or update the user's role to admin
    const { error } = await supabase
      .from('user_roles')
      .upsert({ 
        user_id: user.id,
        role: 'admin',
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error("Error setting admin role:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error making hardcoded email admin:", error);
    return false;
  }
};

// Make current user an admin - function referenced in AuthContext and Index.tsx
export const makeCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const { data: user, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Error fetching current user:", authError);
      return false;
    }
    
    const userId = user.user.id;
    
    // Insert or update the user's role to admin
    const { error } = await supabase
      .from('user_roles')
      .upsert({ 
        user_id: userId,
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

// Check if valid credentials exist - function referenced in Login.tsx
export const hasValidCredentials = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};
