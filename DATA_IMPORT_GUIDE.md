# Data Import Guide for Charles Aris Interactive Map

This guide will walk you through importing your firm data into Supabase for use with the interactive map.

## Prerequisites

1. ✅ Supabase project created
2. ✅ `firms` table created with proper schema
3. ✅ Firm data in Excel/CSV format

## Step 1: Prepare Your Data

### Required Columns
Your Excel/CSV file must include these columns (exact names matter):

| Column Name | Type | Required | Example |
|-------------|------|----------|---------|
| Company Name | Text | ✅ Yes | "Tech Solutions Inc." |
| Category | Text | ✅ Yes | "Technology" |
| Industry | Text | ✅ Yes | "Software" |
| Location | Text | ✅ Yes | "New York, NY" |
| Latitude | Number | ✅ Yes | 40.7128 |
| Longitude | Number | ✅ Yes | -74.0060 |
| Description | Text | ❌ No | "Leading software..." |
| Website | Text | ❌ No | "https://techsolutions.com" |
| Employee Count | Text | ❌ No | "500-1000" |
| Founded Year | Text | ❌ No | "2010" |
| Address | Text | ❌ No | "123 Tech Street..." |
| Phone | Text | ❌ No | "555-0123" |
| Email | Text | ❌ No | "info@techsolutions.com" |

### Data Formatting Tips

1. **Coordinates**: Must be decimal degrees (e.g., 40.7128, not 40°42'46")
2. **Text Fields**: Avoid special characters that might cause import issues
3. **URLs**: Include full URLs with http:// or https://
4. **Phone Numbers**: Use consistent format (e.g., 555-0123)
5. **Employee Count**: Use ranges like "100-500" or specific numbers

## Step 2: Create Supabase Table

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Table Editor** → **New Table**
3. Set table name: `firms`
4. Add columns with these settings:

```sql
-- Primary Key
id: int8, primary key, identity

-- Required Fields
"Company Name": text, not null
Category: text, not null
Industry: text, not null
Location: text, not null
Latitude: numeric, not null
Longitude: numeric, not null

-- Optional Fields
Description: text
Website: text
"Employee Count": text
"Founded Year": text
Address: text
Phone: text
Email: text
```

### Option B: Using SQL

Run this SQL in the Supabase SQL Editor:

```sql
CREATE TABLE firms (
    id BIGSERIAL PRIMARY KEY,
    "Company Name" TEXT NOT NULL,
    Category TEXT NOT NULL,
    Industry TEXT NOT NULL,
    Location TEXT NOT NULL,
    Latitude NUMERIC NOT NULL,
    Longitude NUMERIC NOT NULL,
    Description TEXT,
    Website TEXT,
    "Employee Count" TEXT,
    "Founded Year" TEXT,
    Address TEXT,
    Phone TEXT,
    Email TEXT
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed)
CREATE POLICY "Allow all operations" ON firms FOR ALL USING (true);
```

## Step 3: Import Your Data

### Option A: CSV Import (Recommended)

1. **Export your Excel file as CSV**
   - Open Excel file
   - File → Save As → CSV (Comma delimited)
   - Save with UTF-8 encoding

2. **Import to Supabase**
   - Go to **Table Editor** → **firms** table
   - Click **Import Data** button
   - Choose **CSV** format
   - Upload your CSV file
   - Map columns if needed
   - Click **Import**

### Option B: Manual Entry

1. Go to **Table Editor** → **firms** table
2. Click **Insert Row** button
3. Fill in the required fields
4. Click **Save**

### Option C: API Import

Use the Supabase client in your application:

```javascript
const { data, error } = await supabase
    .from('firms')
    .insert([
        {
            "Company Name": "Tech Solutions Inc.",
            Category: "Technology",
            Industry: "Software",
            Location: "New York, NY",
            Latitude: 40.7128,
            Longitude: -74.0060,
            Description: "Leading software development company...",
            Website: "https://techsolutions.com",
            "Employee Count": "500-1000",
            "Founded Year": "2010"
        }
        // ... more firms
    ]);
```

## Step 4: Verify Your Data

1. **Check the table**: Go to **Table Editor** → **firms**
2. **Verify coordinates**: Ensure latitude/longitude are numeric
3. **Check categories**: Verify Category field has consistent values
4. **Test the map**: Run your application and check if firms appear

## Step 5: Troubleshooting

### Common Issues

1. **"No firms displayed"**
   - Check if coordinates are numeric
   - Verify required fields have data
   - Check browser console for errors

2. **"Invalid coordinates"**
   - Ensure latitude is between -90 and 90
   - Ensure longitude is between -180 and 180
   - Check for extra spaces or characters

3. **"Import failed"**
   - Check CSV format and encoding
   - Verify column names match exactly
   - Check for special characters in data

### Data Validation

Use this SQL query to validate your data:

```sql
-- Check for invalid coordinates
SELECT * FROM firms 
WHERE Latitude < -90 OR Latitude > 90 
   OR Longitude < -180 OR Longitude > 180;

-- Check for missing required fields
SELECT * FROM firms 
WHERE "Company Name" IS NULL 
   OR Category IS NULL 
   OR Industry IS NULL 
   OR Location IS NULL 
   OR Latitude IS NULL 
   OR Longitude IS NULL;

-- Count firms by category
SELECT Category, COUNT(*) as count 
FROM firms 
GROUP BY Category 
ORDER BY count DESC;
```

## Sample Data

Use the provided `firm_data_template.csv` file as a reference for the correct format.

## Next Steps

After successful data import:

1. ✅ Update `config.js` with your Supabase credentials
2. ✅ Test the connection with `npm run setup`
3. ✅ Run the application with `npm run dev`
4. ✅ Verify firms appear on the map
5. ✅ Test layer toggling and firm information display

## Support

If you encounter issues during data import:
1. Check the Supabase documentation
2. Verify your table schema matches the requirements
3. Test with a small dataset first
4. Check the browser console for error messages


