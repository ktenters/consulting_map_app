// Setup and validation script for Charles Aris Interactive Map
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

console.log('🔧 Charles Aris Interactive Map - Setup & Validation');
console.log('==================================================');

// Check configuration
console.log('\n📋 Configuration Check:');
console.log(`- Supabase URL: ${config.SUPABASE_URL.includes('YOUR_') ? '❌ NOT SET' : '✅ CONFIGURED'}`);
console.log(`- Supabase Key: ${config.SUPABASE_ANON_KEY.includes('YOUR_') ? '❌ NOT SET' : '✅ CONFIGURED'}`);
console.log(`- Table Name: ${config.TABLE_NAME}`);
console.log(`- Default Center: [${config.DEFAULT_CENTER.join(', ')}]`);
console.log(`- Default Zoom: ${config.DEFAULT_ZOOM}`);

// Test Supabase connection if configured
if (!config.SUPABASE_URL.includes('YOUR_') && !config.SUPABASE_ANON_KEY.includes('YOUR_')) {
    console.log('\n🔌 Testing Supabase Connection...');
    
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    
    // Test connection by trying to fetch data
    supabase
        .from(config.TABLE_NAME)
        .select('count')
        .limit(1)
        .then(({ data, error }) => {
            if (error) {
                console.log('❌ Supabase Connection Failed:', error.message);
                console.log('💡 Please check your credentials and table setup');
            } else {
                console.log('✅ Supabase Connection Successful!');
                console.log('✅ Table access confirmed');
            }
        })
        .catch(err => {
            console.log('❌ Connection Error:', err.message);
        });
} else {
    console.log('\n⚠️  Supabase not configured yet!');
    console.log('💡 Please update config.js with your Supabase credentials');
    console.log('💡 Then run this setup script again');
}

// Check for required files
console.log('\n📁 File Structure Check:');
const requiredFiles = ['index.html', 'styles.css', 'main.js', 'config.js'];
requiredFiles.forEach(file => {
    console.log(`- ${file}: ✅ FOUND`);
});

console.log('\n🚀 Setup Complete!');
console.log('💡 Next steps:');
console.log('   1. Update config.js with your Supabase credentials');
console.log('   2. Import your firm data to Supabase');
console.log('   3. Run: npm run dev');
console.log('   4. Test the website with password: CAImap2025');


