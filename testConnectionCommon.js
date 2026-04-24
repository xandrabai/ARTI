const { createClient } = require('@supabase/supabase-js');

// Copying credentials just for the test
const supabaseUrl = 'https://tolzzjxeejuqwhuhznuv.supabase.co/rest/v1/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbHp6anhlZWp1cXdodWh6bnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDQ1NDAsImV4cCI6MjA5MjUyMDU0MH0.YB5r2_hRkoLmRdtUBTvpeUTt9VNbo5y1GNfyl67aip8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("Testing Supabase connection...");
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("❌ Connection failed. Error:", error.message);
    } else {
      console.log("✅ Successfully connected to Supabase!");
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

testConnection();
