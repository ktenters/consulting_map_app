# Netlify Deployment Guide

## Overview
This project is configured for deployment on Netlify with the following setup:

## Configuration Files

### netlify.toml
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Node Version**: 18
- **SPA Redirects**: Configured for single-page application routing

### vite.config.js
- **Build Output**: `dist` directory
- **Assets**: `assets` subdirectory
- **Source Maps**: Disabled for production
- **Development Server**: Port 3000

## Build Process

1. **Install Dependencies**: Netlify automatically runs `npm install`
2. **Build Application**: Runs `npm run build` which executes `vite build`
3. **Output**: Generated files are placed in the `dist` directory
4. **Deploy**: Netlify serves files from the `dist` directory

## Key Changes Made for Netlify

### 1. Leaflet Import
- **Before**: ES module import `import L from 'leaflet'`
- **After**: CDN script tag in HTML + global variable access
- **Reason**: Avoids module bundling issues with Leaflet

### 2. Build Configuration
- Added `netlify.toml` for proper build settings
- Added `vite.config.js` for Vite build optimization
- Configured proper publish directory

### 3. Package Scripts
- **Build**: `vite build` (for production)
- **Start**: `vite preview --port 3000` (for local testing)

## Troubleshooting

### Build Failures
- **Error**: "Build script returned non-zero exit code"
- **Solution**: Check that all dependencies are properly listed in `package.json`
- **Check**: Ensure `node_modules` is not committed (use `.gitignore`)

### Module Import Issues
- **Error**: "Cannot resolve module 'leaflet'"
- **Solution**: Use CDN imports for external libraries that don't support ES modules

### File Not Found Errors
- **Error**: "Cannot find module './config.js'"
- **Solution**: Ensure all referenced files exist and are properly committed

## Local Testing

Before deploying, test the build locally:

```bash
npm install
npm run build
npm run start
```

Visit `http://localhost:3000` to verify the build works correctly.

## Deployment Checklist

- [ ] All source files committed to Git
- [ ] `node_modules` excluded via `.gitignore`
- [ ] Build command works locally (`npm run build`)
- [ ] `dist` directory contains all necessary files
- [ ] Netlify configuration file (`netlify.toml`) present
- [ ] Vite configuration file (`vite.config.js`) present

## Environment Variables

If you need to add environment variables for Supabase or other services:

1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add variables like:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SITE_PASSWORD`

## Support

If deployment issues persist:
1. Check Netlify build logs for specific error messages
2. Verify all configuration files are present
3. Test build process locally
4. Check that all dependencies are properly installed
