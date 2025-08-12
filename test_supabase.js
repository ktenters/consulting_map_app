// Test script to verify Supabase connection and firm_locations_meta view
// Run this in your browser console to test the connection

async function testSupabaseConnection() {
    try {
        // Test basic connection
        console.log('Testing Supabase connection...');
        
        // You'll need to replace these with your actual values
        const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
        const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
        
        if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
            console.error('Please update the SUPABASE_URL and SUPABASE_ANON_KEY variables with your actual values');
            return;
        }
        
        // Import Supabase client
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Test the firm_locations_meta view
        console.log('Testing firm_locations_meta view...');
        const { data, error } = await supabase
            .from('firm_locations_meta')
            .select('last_updated')
            .maybeSingle();
            
        if (error) {
            console.error('Error accessing firm_locations_meta:', error);
            return;
        }
        
        if (!data?.last_updated) {
            console.log('firm_locations_meta view exists but has no data');
            console.log('This might mean:');
            console.log('1. The view was created but firm_locations table is empty');
            console.log('2. The timestamp columns (created_at, updated_at) are missing');
            console.log('3. The view needs to be created');
        } else {
            console.log('✅ firm_locations_meta view working!');
            console.log('Last updated:', data.last_updated);
            console.log('Formatted:', new Date(data.last_updated).toLocaleDateString('en-US', {
                month: 'long',
                day: '2-digit',
                year: 'numeric'
            }));
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Alternative: Test with existing window.supabase if available
async function testExistingSupabase() {
    if (!window.supabase) {
        console.log('No existing Supabase client found. Run testSupabaseConnection() instead.');
        return;
    }
    
    try {
        console.log('Testing existing Supabase client...');
        const { data, error } = await window.supabase
            .from('firm_locations_meta')
            .select('last_updated')
            .maybeSingle();
            
        if (error) {
            console.error('Error:', error);
        } else if (data?.last_updated) {
            console.log('✅ Success! Last updated:', data.last_updated);
        } else {
            console.log('View exists but no data');
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the appropriate test
if (window.supabase) {
    console.log('Found existing Supabase client, testing...');
    testExistingSupabase();
} else {
    console.log('No existing Supabase client. To test manually:');
    console.log('1. Update SUPABASE_URL and SUPABASE_ANON_KEY in testSupabaseConnection()');
    console.log('2. Run: testSupabaseConnection()');
}
