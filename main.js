// Import Leaflet from CDN (loaded in HTML)
// import L from 'leaflet';
import { createClient } from '@supabase/supabase-js';
import './styles.css';


// Check if Leaflet is available
if (typeof L === 'undefined') {
    console.error('Leaflet is not loaded. Please check the CDN link in index.html');
}

// Initialize Supabase client with Vite environment variables
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL || 'https://qhmxiqpztsffivyozoax.supabase.co',
    import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobXhpcXB6dHNmZml2eW96b2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjcxMTgsImV4cCI6MjA3MDQ0MzExOH0.nCiTghwzWH6LHgqMju_4zUV9B7k97TLvGqdUPAg2vYc'
);

// Dynamic firm management - no hardcoded categories
let firmLayers = {}; // Leaflet layer groups for each firm
let firmColors = {}; // Stable colors for each firm
let firmData = []; // Current data from Supabase

// Color palette for firms
const COLOR_PALETTE = [
    '#1f4e79', '#00a0dc', '#dc3545', '#ffc107', '#28a745',
    '#6f42c1', '#fd7e14', '#0073aa', '#e83e8c', '#20c997',
    '#17a2b8', '#6c757d', '#343a40', '#495057', '#6f42c1'
];

// Global variables
let map;
let realtimeSubscription = null; // Supabase realtime subscription

// DOM elements
const passwordScreen = document.getElementById('passwordScreen');
const mainApp = document.getElementById('mainApp');
const passwordInput = document.getElementById('passwordInput');
const submitPassword = document.getElementById('submitPassword');
const passwordError = document.getElementById('passwordError');
const logoutBtn = document.getElementById('logoutBtn');
const layerCheckboxes = document.getElementById('layerCheckboxes');
const selectAllLayersBtn = document.getElementById('selectAllLayers');
const clearAllLayersBtn = document.getElementById('clearAllLayers');
const firmDetails = document.getElementById('firmDetails');
const resetView = document.getElementById('resetView');
const fullscreen = document.getElementById('fullscreen');

// Password protection
function checkPassword() {
    const password = passwordInput.value.trim();
    
    if (password === 'CAImap2025') {
        passwordScreen.style.display = 'none';
        mainApp.classList.remove('hidden');
        mainApp.classList.add('fade-in');
        initializeApp();
    } else {
        passwordError.textContent = 'Incorrect password. Please try again.';
        passwordInput.value = '';
        passwordInput.focus();
    }
}

function logout() {
    mainApp.classList.add('hidden');
    passwordScreen.style.display = 'flex';
    passwordInput.value = '';
    passwordError.textContent = '';
    if (map) {
        map.remove();
        map = null;
    }
}

// Initialize the application
async function initializeApp() {
    try {
        console.log('Initializing application...');
        
        // Initialize map first
        initializeMap();
        
        // Wait a moment for map to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setupEventListeners();
        
        // Load initial data from Supabase
        console.log('Fetching initial data from Supabase...');
        const initialData = await fetchLocations();
        console.log('Initial data received:', initialData);
        
        if (initialData && initialData.length > 0) {
            renderMarkers(initialData);
        } else {
            console.warn('No initial data received from Supabase');
            showError('No firm locations found. Please check your Supabase table.');
        }
        
        // Subscribe to realtime changes
        subscribeRealtime();
        
        // Initialize last updated badge
        initializeLastUpdatedBadge();
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to initialize the application. Please try again.');
    }
}

// Fetch firm locations from Supabase
async function fetchLocations() {
    try {
        console.log('Fetching firm locations from public.firm_locations...');
        
        const { data, error } = await supabase
            .from('firm_locations')
            .select('Firm, Latitude, Longitude');
        
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        if (data && data.length > 0) {
            console.log(`Found ${data.length} firm locations:`, data);
            return data;
        } else {
            console.log('No data found in firm_locations table');
            return [];
        }
    } catch (error) {
        console.error('Failed to fetch firm locations:', error);
        showError('Couldn\'t load firm locations. Please check your Supabase table.');
        return [];
    }
}

// Render markers from Supabase data
function renderMarkers(rows) {
    if (!map) {
        console.error('Map is not initialized!');
        return;
    }
    
    console.log(`Rendering ${rows.length} firm locations...`);
    
    // Clear existing layers and data
    Object.values(firmLayers).forEach(layer => {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    });
    firmLayers = {};
    firmColors = {};
    firmData = [];
    
    // Group rows by firm
    const firmsByGroup = {};
    rows.forEach(row => {
        const lat = Number(row.Latitude);
        const lng = Number(row.Longitude);
        const firm = row.Firm;
        
        if (isFinite(lat) && isFinite(lng) && firm) {
            if (!firmsByGroup[firm]) {
                firmsByGroup[firm] = [];
            }
            firmsByGroup[firm].push({ lat, lng, firm });
        } else {
            console.warn('Skipping invalid row:', row);
        }
    });
    
    console.log('Firms found:', Object.keys(firmsByGroup));
    
    // Create layer for each firm
    Object.keys(firmsByGroup).forEach((firm, index) => {
        // Assign stable color
        firmColors[firm] = COLOR_PALETTE[index % COLOR_PALETTE.length];
        
        // Create layer group
        firmLayers[firm] = L.layerGroup();
        
        // Add markers to layer
        firmsByGroup[firm].forEach(location => {
            const icon = createFirmIcon(firm);
            const marker = L.marker([location.lat, location.lng], { icon })
                .bindPopup(createPopupContent(location))
                .on('click', () => showFirmDetails(location));
            
            firmLayers[firm].addLayer(marker);
        });
        
        // Add layer to map
        map.addLayer(firmLayers[firm]);
        
        console.log(`Created layer for ${firm} with ${firmsByGroup[firm].length} markers`);
    });
    
    // Store data for UI updates
    firmData = rows;
    
    // Fit map to show all markers with zoom limits
    if (Object.keys(firmLayers).length > 0) {
        const allMarkers = Object.values(firmLayers).flatMap(layer => layer.getLayers());
        if (allMarkers.length > 0) {
            const group = L.featureGroup(allMarkers);
            map.fitBounds(group.getBounds(), {
                padding: [50, 50],
                maxZoom: 6  // don't zoom past 6 when auto-fitting
            });
        }
    }
    
    // Update UI
    updateLayerControls();
    console.log('Markers rendered successfully');
}

// Update layer controls based on current firms
function updateLayerControls() {
    const layerCheckboxes = document.getElementById('layerCheckboxes');
    if (!layerCheckboxes) return;
    
    layerCheckboxes.innerHTML = '';
    
    Object.keys(firmLayers).forEach(firm => {
        const markerCount = firmLayers[firm].getLayers().length;
        const firmId = firm.replace(/[^a-zA-Z0-9]/g, '');
        
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'layer-checkbox';
        checkboxDiv.innerHTML = `
            <input type="checkbox" id="layer-${firmId}" checked>
            <label for="layer-${firmId}">${firm}</label>
            <span class="layer-count">${markerCount}</span>
        `;
        
        const checkbox = checkboxDiv.querySelector('input');
        checkbox.addEventListener('change', (e) => {
            toggleFirmLayer(firm, e.target.checked);
        });
        
        layerCheckboxes.appendChild(checkboxDiv);
    });
    
    console.log('Layer controls updated for firms:', Object.keys(firmLayers));
}

// Subscribe to Supabase realtime changes
function subscribeRealtime() {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
    }
    
    realtimeSubscription = supabase
        .channel('firm_locations_changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'firm_locations'
            },
            (payload) => {
                console.log('Realtime change:', payload);
                handleRealtimeChange(payload);
            }
        )
        .subscribe();
}

// Handle realtime changes from Supabase
async function handleRealtimeChange(payload) {
    try {
        // Fetch fresh data and re-render
        const freshData = await fetchLocations();
        renderMarkers(freshData);
        
        // Show notification
        const eventType = payload.eventType;
        if (eventType === 'INSERT') {
            showError('New firm location added!');
        } else if (eventType === 'UPDATE') {
            showError('Firm location updated!');
        } else if (eventType === 'DELETE') {
            showError('Firm location removed!');
        }
    } catch (error) {
        console.error('Error handling realtime change:', error);
        showError('Error updating map. Please refresh.');
    }
}

// Fit map bounds to show all visible markers
function fitMapToMarkers() {
    if (Object.keys(firmLayers).length > 0) {
        const allMarkers = Object.values(firmLayers).flatMap(layer => layer.getLayers());
        if (allMarkers.length > 0) {
            const group = L.featureGroup(allMarkers);
            map.fitBounds(group.getBounds(), {
                padding: [50, 50],
                maxZoom: 6  // don't zoom past 6 when auto-fitting
            });
        }
    }
}

// Initialize last updated badge
function initializeLastUpdatedBadge() {
    try {
        const sidebarContainer = document.getElementById('lastUpdatedContainer');
        if (sidebarContainer && window.LastUpdatedBadge) {
            window.lastUpdatedBadge = new window.LastUpdatedBadge(sidebarContainer);
            console.log('Last updated badge initialized in sidebar');
        } else {
            console.warn('Could not initialize last updated badge - missing sidebar container or component');
        }
    } catch (error) {
        console.error('Error initializing last updated badge:', error);
    }
}

// Refresh firm data from Supabase
async function refreshFirmData() {
    try {
        console.log('Refreshing firm data...');
        const freshData = await fetchLocations();
        renderMarkers(freshData);
        showError('Firm data refreshed successfully!');
    } catch (error) {
        console.error('Error refreshing firm data:', error);
        showError('Failed to refresh firm data. Please try again.');
    }
}

// Initialize Leaflet map
function initializeMap() {
    // Create map centered on US with smooth zoom controls
    map = L.map('map', {
        center: [39.5, -98.35],   // continental US center
        zoom: 4,                  // starting zoom
        minZoom: 3,
        maxZoom: 12,
        
        // smoother interactions:
        zoomSnap: 0.5,            // allow half zoom levels
        zoomDelta: 0.5,           // +/- buttons & double-click change by 0.5
        wheelDebounceTime: 80,    // slow down fast trackpads a bit
        wheelPxPerZoomLevel: 100, // more scroll pixels per zoom level = gentler
        scrollWheelZoom: true,
        zoomAnimation: true,
        markerZoomAnimation: true,
        
        zoomControl: true,
        attributionControl: true
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Map is ready for dynamic firm data
}



// Create custom icon for firms
function createFirmIcon(firm) {
    const color = firmColors[firm] || '#6c757d';
    
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
}

// Create popup content for markers
function createPopupContent(location) {
    return `
        <div class="firm-popup">
            <h3>${location.firm}</h3>
            <p><strong>Location:</strong> ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}</p>
        </div>
    `;
}

// Show firm details in sidebar
function showFirmDetails(location) {
    firmDetails.innerHTML = `
        <h4>${location.firm}</h4>
        <p><strong>Location:</strong> ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}</p>
    `;
}



// Toggle firm layer visibility
function toggleFirmLayer(firm, visible) {
    if (firmLayers[firm]) {
        if (visible) {
            map.addLayer(firmLayers[firm]);
            console.log(`Added ${firm} layer to map`);
        } else {
            map.removeLayer(firmLayers[firm]);
            console.log(`Removed ${firm} layer from map`);
        }
    }
}

// Select all firm layers
function selectAllLayers() {
    const checkboxes = layerCheckboxes.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        const firmId = checkbox.id.replace('layer-', '');
        const firm = Object.keys(firmLayers).find(f => f.replace(/[^a-zA-Z0-9]/g, '') === firmId);
        if (firm && firmLayers[firm]) {
            map.addLayer(firmLayers[firm]);
        }
    });
    console.log('All firm layers selected');
}

// Clear all firm layers
function clearAllLayers() {
    const checkboxes = layerCheckboxes.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        const firmId = checkbox.id.replace('layer-', '');
        const firm = Object.keys(firmLayers).find(f => f.replace(/[^a-zA-Z0-9]/g, '') === firmId);
        if (firm && firmLayers[firm]) {
            map.removeLayer(firmLayers[firm]);
        }
    });
    console.log('All firm layers cleared');
}

// Reset map view
function resetMapView() {
    map.setView([39.5, -98.35], 4, { maxZoom: 6 }); // Center of US with zoom limit
}

// Toggle fullscreen
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Logout
    logoutBtn.addEventListener('click', logout);
    
    // Layer controls
    selectAllLayersBtn.addEventListener('click', selectAllLayers);
    clearAllLayersBtn.addEventListener('click', clearAllLayers);
    
    // Data refresh
    const refreshDataBtn = document.getElementById('refreshData');
    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', async () => {
            refreshDataBtn.textContent = 'Refreshing...';
            refreshDataBtn.disabled = true;
            await refreshFirmData();
            refreshDataBtn.textContent = 'Refresh Data';
            refreshDataBtn.disabled = false;
        });
    }
    

    
    // Map controls
    resetView.addEventListener('click', resetMapView);
    fullscreen.addEventListener('click', toggleFullscreen);
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 1rem; border-radius: 8px; z-index: 10000;';
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Set up password event listeners immediately
    submitPassword.addEventListener('click', checkPassword);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkPassword();
    });
    
    // Focus on password input
    passwordInput.focus();
    
    // Add some CSS for custom markers
    const style = document.createElement('style');
    style.textContent = `
        .custom-marker {
            background: transparent !important;
            border: none !important;
        }
        
        .firm-popup h3 {
            color: var(--accent-1);
            margin-bottom: 0.5rem;
        }
        
        .firm-popup p {
            margin-bottom: 0.3rem;
            font-size: 0.9rem;
        }
        
        .website-link {
            display: inline-block;
            background: var(--accent-2);
            color: white;
            padding: 0.5rem 1rem;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 0.5rem;
            font-size: 0.9rem;
        }
        
        .website-link:hover {
            background: var(--accent-1);
        }
    `;
    document.head.appendChild(style);
});
