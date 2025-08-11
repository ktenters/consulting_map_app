// Configuration file for Charles Aris Interactive Map
export const config = {
    // Supabase Configuration
    SUPABASE_URL: 'https://qhmxiqpztsffivyozoax.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobXhpcXB6dHNmZml2eW96b2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjcxMTgsImV4cCI6MjA3MDQ0MzExOH0.nCiTghwzWH6LHgqMju_4zUV9B7k97TLvGqdUPAg2vYc',
    
    // Map Configuration
    DEFAULT_CENTER: [39.8283, -98.5795], // Center of US
    DEFAULT_ZOOM: 4,
    
    // Password
    SITE_PASSWORD: 'CAImap2025',
    
    // Data Configuration
    TABLE_NAME: 'firms', // Your Supabase table name
    EXCEL_COLUMNS: {
        name: 'Company Name',
        category: 'Category',
        industry: 'Industry',
        location: 'Location',
        latitude: 'Latitude',
        longitude: 'Longitude',
        description: 'Description',
        website: 'Website',
        employees: 'Employee Count',
        founded: 'Founded Year',
        address: 'Address',
        phone: 'Phone',
        email: 'Email'
    }
};

