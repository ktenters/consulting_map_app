# Charles Aris Interactive Firm Map

A password-protected interactive map website displaying firm locations with customizable layers, built with Leaflet.js and Supabase.

## Features

- 🔐 **Password Protection**: Secure access with password "CAImap2025"
- 🗺️ **Interactive Map**: Built with Leaflet.js for smooth map interactions
- 📍 **Layer Management**: Toggle different firm categories on/off
- 🏢 **Firm Information**: Detailed popups and sidebar information for each firm
- 🎨 **Brand Integration**: Charles Aris colors and logo throughout
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔄 **Real-time Data**: Connects to Supabase for live firm data

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Create a table called `firms` with the following columns:
   - `id` (int, primary key)
   - `Company Name` (text)
   - `Category` (text)
   - `Industry` (text)
   - `Location` (text)
   - `Latitude` (numeric)
   - `Longitude` (numeric)
   - `Description` (text)
   - `Website` (text)
   - `Employee Count` (text)
   - `Founded Year` (text)
   - `Address` (text)
   - `Phone` (text)
   - `Email` (text)

3. Update `config.js` with your Supabase credentials:
   ```javascript
   SUPABASE_URL: 'https://your-project.supabase.co',
   SUPABASE_ANON_KEY: 'your-anon-key-here'
   ```

### 3. Import Your Data
- Use the provided `firm_data_template.csv` as a template
- Import your Excel/CSV data into the Supabase `firms` table
- Ensure latitude and longitude coordinates are properly formatted

### 4. Run the Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

## Data Structure

The application expects firm data with the following structure:

| Field | Description | Example |
|-------|-------------|---------|
| Company Name | Firm's official name | "Tech Solutions Inc." |
| Category | Business category | "Technology" |
| Industry | Specific industry | "Software" |
| Location | City and state | "New York, NY" |
| Latitude | GPS latitude | 40.7128 |
| Longitude | GPS longitude | -74.0060 |
| Description | Brief company description | "Leading software development..." |
| Website | Company website URL | "https://techsolutions.com" |
| Employee Count | Employee range | "500-1000" |
| Founded Year | Year company was founded | "2010" |
| Address | Full street address | "123 Tech Street..." |
| Phone | Contact phone number | "555-0123" |
| Email | Contact email address | "info@techsolutions.com" |

## Map Layers

The map automatically creates layers based on the `Category` field in your data. Users can:
- Toggle individual layers on/off
- Select all layers at once
- Clear all layers
- View firm counts per category

## Customization

### Colors
Update the CSS variables in `styles.css`:
```css
:root {
    --cai-primary: #1f4e79;      /* Dark Blue */
    --cai-secondary: #0073aa;     /* Medium Blue */
    --cai-accent: #00a0dc;        /* Light Blue */
    --cai-gold: #d4af37;          /* Gold */
    /* ... */
}
```

### Map Settings
Modify `config.js`:
```javascript
DEFAULT_CENTER: [39.8283, -98.5795], // Map center coordinates
DEFAULT_ZOOM: 4,                      // Initial zoom level
TABLE_NAME: 'firms',                  // Supabase table name
```

## Troubleshooting

### Common Issues

1. **Map not loading**: Check if Leaflet CSS is accessible
2. **No firms displayed**: Verify Supabase credentials and data format
3. **Password not working**: Ensure password is exactly "CAImap2025"
4. **Coordinates not working**: Check that latitude/longitude are numeric values

### Data Import Tips

- Ensure coordinates are in decimal degrees (e.g., 40.7128, not 40°42'46")
- Verify all required fields have data
- Check for special characters in text fields
- Test with a small dataset first

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

MIT License - see LICENSE file for details.

## Support

For technical support or questions about the Charles Aris Interactive Map, please contact your development team.


