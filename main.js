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

// Predefined consulting firm categories
const CONSULTING_CATEGORIES = [
    'Bain',
    'BCG', 
    'McKinsey',
    'Strategy&',
    'PwC',
    'LEK',
    'Oliver Wyman',
    'EY-Parthenon',
    'Deloitte',
    'Kearney'
];

// Category color mapping for consistent visual identity
const CATEGORY_COLORS = {
    'Bain': '#1f4e79',
    'BCG': '#00a0dc', 
    'McKinsey': '#1f4e79',
    'Strategy&': '#dc3545',
    'PwC': '#ffc107',
    'LEK': '#28a745',
    'Oliver Wyman': '#6f42c1',
    'EY-Parthenon': '#fd7e14',
    'Deloitte': '#0073aa',
    'Kearney': '#e83e8c'
};

// Global variables
let map;
let markersByFirm = {}; // Layer groups for each firm
let currentFirmData = []; // Current data from Supabase
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
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to initialize the application. Please try again.');
    }
}

// Fetch firm locations from Supabase
async function fetchLocations() {
    try {
        console.log('fetchLocations: Starting Supabase query...');
        console.log('Supabase client:', supabase);
        
        // Try multiple possible table names
        let data, error;
        
        // First try firm_locations
        const result1 = await supabase.from('firm_locations').select('firm, latitude, longitude');
        if (result1.data && result1.data.length > 0) {
            data = result1.data;
            error = result1.error;
            console.log('Found data in firm_locations table');
        } else {
            // Try firms table
            const result2 = await supabase.from('firms').select('firm, latitude, longitude');
            if (result2.data && result2.data.length > 0) {
                data = result2.data;
                error = result2.error;
                console.log('Found data in firms table');
            } else {
                // Try with different field names
                const result3 = await supabase.from('firms').select('firm_name, latitude, longitude');
                if (result3.data && result3.data.length > 0) {
                    data = result3.data.map(row => ({
                        firm: row.firm_name,
                        latitude: row.latitude,
                        longitude: row.longitude
                    }));
                    error = result3.error;
                    console.log('Found data in firms table with firm_name field');
                } else {
                    data = [];
                    error = null;
                    console.log('No data found in any table');
                }
            }
        }
        
        console.log('Supabase response:', { data, error });
        
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        if (data && data.length > 0) {
            console.log('Raw Supabase data:', data);
            console.log('Data length:', data.length);
            console.log('First row:', data[0]);
            return data;
        } else {
            console.log('No data found in firm_locations table');
            return [];
        }
    } catch (error) {
        console.error('Failed to fetch firm locations:', error);
        showError('Couldn\'t load firm locations. Retry.');
        return [];
    }
}

// Render markers from Supabase data
function renderMarkers(rows) {
    console.log('renderMarkers called with:', rows);
    console.log('Map object:', map);
    
    if (!map) {
        console.error('Map is not initialized!');
        return;
    }
    
    // Clear existing markers
    Object.values(markersByFirm).forEach(layer => {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    });
    markersByFirm = {};
    
    // Initialize layer groups for each allowed firm
    CONSULTING_CATEGORIES.forEach(firm => {
        markersByFirm[firm] = L.layerGroup();
        console.log(`Created layer group for ${firm}`);
    });
    
    let validRows = 0;
    
    rows.forEach((row, index) => {
        console.log(`Processing row ${index}:`, row);
        
        const lat = Number(row.latitude);
        const lng = Number(row.longitude);
        const firm = row.firm;
        
        console.log(`Row ${index} - lat: ${lat}, lng: ${lng}, firm: ${firm}`);
        console.log(`Is lat finite: ${isFinite(lat)}, Is lng finite: ${isFinite(lng)}, Is firm allowed: ${CONSULTING_CATEGORIES.includes(firm)}`);
        
        // Check if lat/lng are valid and firm is allowed
        if (isFinite(lat) && isFinite(lng) && CONSULTING_CATEGORIES.includes(firm)) {
            console.log(`Creating marker for ${firm} at [${lat}, ${lng}]`);
            
            // Create marker
            const icon = createCategoryIcon(firm);
            const marker = L.marker([lat, lng], { icon })
                .bindPopup(createPopupContent({ name: firm, category: firm, coordinates: [lat, lng] }))
                .on('click', () => showFirmDetails({ name: firm, category: firm, coordinates: [lat, lng] }));
            
            // Add to appropriate layer group
            if (markersByFirm[firm]) {
                markersByFirm[firm].addLayer(marker);
                validRows++;
                console.log(`Added marker to ${firm} layer. Total markers in ${firm}: ${markersByFirm[firm].getLayers().length}`);
            } else {
                console.error(`No layer group found for ${firm}`);
            }
        } else {
            console.warn(`Skipping invalid row ${index}:`, row);
            console.warn(`lat: ${lat} (finite: ${isFinite(lat)}), lng: ${lng} (finite: ${isFinite(lng)}), firm: ${firm} (allowed: ${CONSULTING_CATEGORIES.includes(firm)})`);
        }
    });
    
    console.log(`Rendered ${validRows} valid markers from ${rows.length} rows`);
    console.log('Final markersByFirm:', markersByFirm);
    
    // Add all layer groups to map initially
    Object.values(markersByFirm).forEach((layer, index) => {
        console.log(`Adding layer ${index} to map:`, layer);
        map.addLayer(layer);
        console.log(`Layer ${index} added to map. Map has ${map.getLayers().length} layers`);
    });
    
    // Update counts and refresh UI
    updateCounts();
    populateLayerControls();
}

// Update count pills for each firm
function updateCounts() {
    CONSULTING_CATEGORIES.forEach(firm => {
        const count = markersByFirm[firm] ? markersByFirm[firm].getLayers().length : 0;
        const countElement = document.querySelector(`#layer-${firm.replace(/[^a-zA-Z0-9]/g, '')} + label + .layer-count`);
        if (countElement) {
            countElement.textContent = count;
        }
    });
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

// Refresh firm data from Supabase
async function refreshFirmData() {
    try {
        const { data, error } = await supabase
            .from('firm_locations')
            .select('firm, latitude, longitude');
        
        if (error) {
            console.warn('Failed to refresh firm data:', error);
            return;
        }
        
        if (data && data.length > 0) {
            // Transform the new data
            const newFirmData = data.map(firm => {
                const firmName = firm.firm_name || firm.Firm;
                const firmLat = parseFloat(firm.latitude || firm.Latitude || 0);
                const firmLng = parseFloat(firm.longitude || firm.Longitude || 0);
                
                // Map firm to predefined category based on firm name
                let category = 'Other';
                for (const cat of CONSULTING_CATEGORIES) {
                    if (firmName && firmName.toLowerCase().includes(cat.toLowerCase())) {
                        category = cat;
                        break;
                    }
                }
                
                return {
                    id: firm.id || Math.random().toString(36).substr(2, 9),
                    name: firmName,
                    category: category,
                    coordinates: [firmLat, firmLng]
                };
            }).filter(firm => 
                firm.coordinates[0] !== 0 && 
                firm.coordinates[1] !== 0 && 
                firm.name
            );
            
            // Check if we have new firms
            const currentFirmNames = new Set(currentFirmData.map(f => f.name));
            const newFirms = newFirmData.filter(firm => !currentFirmNames.has(firm.name));
            
            if (newFirms.length > 0) {
                console.log('Found new firms:', newFirms);
                
                // Add new firms to the map
                newFirms.forEach(firm => {
                    if (!layers[firm.category]) {
                        layers[firm.category] = L.layerGroup();
                        map.addLayer(layers[firm.category]);
                    }
                    
                    const icon = createCategoryIcon(firm.category);
                    const marker = L.marker(firm.coordinates, { icon })
                        .bindPopup(createPopupContent(firm))
                        .on('click', () => showFirmDetails(firm));
                    
                    layers[firm.category].addLayer(marker);
                    
                    if (!markers[firm.category]) {
                        markers[firm.category] = [];
                    }
                    markers[firm.category].push(marker);
                });
                
                // Update the current data
                currentFirmData = newFirmData;
                
                // Refresh the layer controls
                populateLayerControls();
                
                showError(`Added ${newFirms.length} new firm(s) to the map!`);
            }
        }
    } catch (error) {
        console.error('Error refreshing firm data:', error);
    }
}

// Initialize Leaflet map
function initializeMap() {
           // Create map centered on US
           map = L.map('map', {
               center: [39.8283, -98.5795], // Center of US
               zoom: 4,
               zoomControl: true,
               attributionControl: true
           });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add firms to map
    addFirmsToMap();
}

// This function is no longer needed - markers are now rendered by renderMarkers()
function addFirmsToMap() {
    console.log('addFirmsToMap is deprecated - use renderMarkers() instead');
}

// Create custom icon for different categories
function createCategoryIcon(category) {
    // Use predefined category colors for consistent visual identity
    const color = CATEGORY_COLORS[category] || '#6c757d'; // Default gray for unknown categories
    
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
function createPopupContent(firm) {
    return `
        <div class="firm-popup">
            <h3>${firm.name}</h3>
            <p><strong>Category:</strong> ${firm.category}</p>
            <p><strong>Coordinates:</strong> ${firm.coordinates[0].toFixed(4)}, ${firm.coordinates[1].toFixed(4)}</p>
        </div>
    `;
}

// Show firm details in sidebar
function showFirmDetails(firm) {
    firmDetails.innerHTML = `
        <h4>${firm.name}</h4>
        <p><strong>Category:</strong> ${firm.category}</p>
        <p><strong>Coordinates:</strong> ${firm.coordinates[0].toFixed(4)}, ${firm.coordinates[1].toFixed(4)}</p>
    `;
}

// Populate layer controls
function populateLayerControls() {
    layerCheckboxes.innerHTML = '';
    
    // Only show the 10 predefined consulting firm categories
    CONSULTING_CATEGORIES.forEach(category => {
        const firmCount = currentFirmData.filter(firm => firm.category === category).length;
        
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'layer-checkbox';
        checkboxDiv.innerHTML = `
            <input type="checkbox" id="layer-${category}" ${firmCount > 0 ? 'checked' : ''}>
            <label for="layer-${category}">${category}</label>
            <span class="layer-count">${firmCount}</span>
        `;
        
        const checkbox = checkboxDiv.querySelector('input');
        checkbox.addEventListener('change', (e) => {
            toggleLayer(category, e.target.checked);
        });
        
        layerCheckboxes.appendChild(checkboxDiv);
    });
}

// Toggle layer visibility
function toggleLayer(category, visible) {
    if (visible) {
        map.addLayer(markersByFirm[category]);
    } else {
        map.removeLayer(markersByFirm[category]);
    }
}

// Select all layers
function selectAllLayers() {
    const checkboxes = layerCheckboxes.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        const category = checkbox.id.replace('layer-', '');
        if (markersByFirm[category]) {
            map.addLayer(markersByFirm[category]);
        }
    });
}

// Clear all layers
function clearAllLayers() {
    const checkboxes = layerCheckboxes.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        const category = checkbox.id.replace('layer-', '');
        if (markersByFirm[category]) {
            map.removeLayer(markersByFirm[category]);
        }
    });
}

// Reset map view
function resetMapView() {
    map.setView([39.8283, -98.5795], 4); // Center of US
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
    
    // Test data loading
    const testDataBtn = document.createElement('button');
    testDataBtn.textContent = 'Test Data Load';
    testDataBtn.className = 'action-btn';
    testDataBtn.style.marginTop = '10px';
    testDataBtn.addEventListener('click', async () => {
        console.log('=== TESTING DATA LOAD ===');
        const testData = await fetchLocations();
        console.log('Test data result:', testData);
        if (testData && testData.length > 0) {
            renderMarkers(testData);
        }
    });
    
    // Add test button to the UI
    const layerActions = document.querySelector('.layer-actions');
    if (layerActions) {
        layerActions.appendChild(testDataBtn);
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
            color: var(--cai-primary);
            margin-bottom: 0.5rem;
        }
        
        .firm-popup p {
            margin-bottom: 0.3rem;
            font-size: 0.9rem;
        }
        
        .website-link {
            display: inline-block;
            background: var(--cai-accent);
            color: white;
            padding: 0.5rem 1rem;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 0.5rem;
            font-size: 0.9rem;
        }
        
        .website-link:hover {
            background: var(--cai-secondary);
        }
    `;
    document.head.appendChild(style);
});
