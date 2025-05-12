
import { supabase } from './supabase';

// Check if is_admin function exists in the database
export const createGetUserByEmailFunction = async () => {
  try {
    // Check if the is_admin function exists
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
