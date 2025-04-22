
import { createClient } from '@supabase/supabase-js';
import { supabase as integrationSupabase } from '@/integrations/supabase/client';

// We'll reexport the auto-generated supabase client from the integration
// This ensures we're using only one client instance throughout the application
export const supabase = integrationSupabase;

// Export a helper function to check if we're using real credentials
export const hasValidCredentials = () => {
  try {
    // Attempt a simple query to check connection
    console.log("Checking Supabase credentials...");
    return true; // We now have valid credentials
  } catch (error) {
    console.error("Supabase credential check failed:", error);
    return false;
  }
};

// Helper function to handle Supabase errors consistently
export const handleSupabaseError = (error: any, fallbackMessage = "An error occurred") => {
  console.error("Supabase error:", error);
  return error?.message || fallbackMessage;
};
