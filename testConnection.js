import { supabase } from './supabaseClient.js';

async function testConnection() {
  console.log("Testing Supabase connection...");
  try {
    // Attempting an auth operation is a quick way to verify we can reach the server
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("❌ Connection failed. Error:", error.message);
    } else {
      console.log("✅ Successfully connected to Supabase!");
    }
  } catch (err) {
    console.error("❌ Unexpected error during connection:", err.message);
  }
}

testConnection();
