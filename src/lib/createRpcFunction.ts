
import { supabase } from './supabase';

export const createGetUserByEmailFunction = async () => {
  try {
    // Create a security definer function that can look up a user by email
    // Note: The function must already exist in the database
    // This is just calling the function to ensure it's created
    const { error } = await supabase.rpc('is_admin');
    
    if (error) {
      console.error("Error checking admin status:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Failed to check function:", error);
    return false;
  }
};

// Call this function once at app startup to ensure the function exists
export const setupRpcFunctions = async () => {
  try {
    await createGetUserByEmailFunction();
    return true;
  } catch (error) {
    console.error("Failed to setup RPC functions:", error);
    return false;
  }
};
