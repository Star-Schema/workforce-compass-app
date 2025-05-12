
import { supabase } from './supabase';

export const createGetUserByEmailFunction = async () => {
  try {
    // Create a security definer function that can look up a user by email
    const { error } = await supabase.rpc('create_get_user_by_email_function');
    
    if (error) {
      console.error("Error creating get_user_by_email function:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Failed to create function:", error);
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
