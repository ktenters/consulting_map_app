// Import Leaflet from CDN (loaded in HTML)
// import L from 'leaflet';
import { createClient } from '@supabase/supabase-js';


// Check if Leaflet is available
if (typeof L === 'undefined') {
    console.error('Leaflet is not loaded. Please check the CDN link in index.html');
}

// Initialize Supabase client with environment variables
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://qhmxiqpztsffivyozoax.supabase.co',
    process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobXhpcXB6dHNmZml2eW96b2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjcxMTgsImV4cCI6MjA3MDQ0MzExOH0.nCiTghwzWH6LHgqMju_4zUV9B7k97TLvGqdUPAg2vYc'
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
let markers = {};
let layers = {};
let currentFirmData = [];

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
        await loadFirmData();
        initializeMap();
        setupEventListeners();
        populateLayerControls();
        
        // Set up automatic data refresh every 5 minutes to catch new firms
        setInterval(async () => {
            console.log('Refreshing firm data from Supabase...');
            await refreshFirmData();
        }, 5 * 60 * 1000); // 5 minutes
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to initialize the application. Please try again.');
    }
}

// Load firm data from Supabase
async function loadFirmData() {
    try {
        // Try to load data from Supabase
        const { data, error } = await supabase
            .from('firms')
            .select('*');
        
        if (error) {
            console.warn('Supabase query failed, using sample data:', error);
            throw error;
        }
        
        if (data && data.length > 0) {
            console.log('Raw Supabase data:', data);
            
            // Transform Supabase data to match our expected format
            currentFirmData = data.map(firm => {
                const firmName = firm.Firm;
                const firmLat = parseFloat(firm.Latitude || 0);
                const firmLng = parseFloat(firm.Longitude || 0);
                
                // Map firm to predefined category based on firm name
                let category = 'Other';
                for (const cat of CONSULTING_CATEGORIES) {
                    if (firmName && firmName.toLowerCase().includes(cat.toLowerCase())) {
                        category = cat;
                        break;
                    }
                }
                
                return {
                    id: firm.ID || firm.id || Math.random().toString(36).substr(2, 9),
                    name: firmName,
                    category: category,
                    location: 'Location not specified',
                    coordinates: [firmLat, firmLng],
                    description: 'Consulting firm',
                    website: '',
                    employees: '',
                    founded: '',
                    address: '',
                    phone: '',
                    email: ''
                };
            }).filter(firm => 
                firm.coordinates[0] !== 0 && 
                firm.coordinates[1] !== 0 && 
                firm.name
            );
            
            console.log('Transformed firm data:', currentFirmData);
            console.log('Loaded firm data from Supabase:', currentFirmData.length, 'firms');
        } else {
            throw new Error('No data found in Supabase');
        }
        
        // Fallback to sample data if no valid data found
        if (currentFirmData.length === 0) {
            throw new Error('No valid firm data found');
        }
        
        // Create layers for all predefined categories (even if no firms yet)
        CONSULTING_CATEGORIES.forEach(category => {
            layers[category] = L.layerGroup();
        });
        
        // Also create layer for 'Other' category if we have firms that don't match
        if (currentFirmData.some(firm => firm.category === 'Other')) {
            layers['Other'] = L.layerGroup();
        }
        
        console.log('Created layers for categories:', Object.keys(layers));
        
    } catch (error) {
        console.warn('Using sample data due to:', error.message);
        
        // Sample data structure for demonstration
        currentFirmData = [
            {
                id: 1,
                name: 'Tech Solutions Inc.',
                category: 'Tech Solutions Inc.',
                location: 'New York, NY',
                coordinates: [40.7128, -74.0060],
                description: 'Leading software development company specializing in enterprise solutions.',
                website: 'https://techsolutions.com',
                employees: '500-1000',
                founded: '2010'
            },
            {
                id: 2,
                name: 'Global Manufacturing Co.',
                category: 'Global Manufacturing Co.',
                location: 'Chicago, IL',
                coordinates: [41.8781, -87.6298],
                description: 'International manufacturing company with operations in 15 countries.',
                website: 'https://globalmanufacturing.com',
                employees: '1000-5000',
                founded: '1985'
            },
            {
                id: 3,
                name: 'Healthcare Partners',
                category: 'Healthcare Partners',
                location: 'Los Angeles, CA',
                coordinates: [34.0522, -118.2437],
                description: 'Healthcare management and consulting services.',
                website: 'https://healthcarepartners.com',
                employees: '100-500',
                founded: '2005'
            },
            {
                id: 4,
                name: 'Financial Services Group',
                category: 'Financial Services Group',
                location: 'Boston, MA',
                coordinates: [42.3601, -71.0589],
                description: 'Investment banking and financial advisory services.',
                website: 'https://financialservices.com',
                employees: '500-1000',
                founded: '1995'
            },
            {
                id: 5,
                name: 'Energy Solutions',
                category: 'Energy Solutions',
                location: 'Houston, TX',
                coordinates: [29.7604, -95.3698],
                description: 'Renewable energy company focusing on solar and wind power.',
                website: 'https://energysolutions.com',
                employees: '100-500',
                founded: '2012'
            }
        ];
        
        // Create layers for all predefined categories for sample data
        CONSULTING_CATEGORIES.forEach(category => {
            layers[category] = L.layerGroup();
        });
        
        console.log('Created sample data layers for categories:', Object.keys(layers));
    }
}

// Refresh firm data from Supabase
async function refreshFirmData() {
    try {
        const { data, error } = await supabase
            .from('firms')
            .select('*');
        
        if (error) {
            console.warn('Failed to refresh firm data:', error);
            return;
        }
        
        if (data && data.length > 0) {
            // Transform the new data
            const newFirmData = data.map(firm => {
                const firmName = firm.Firm;
                const firmLat = parseFloat(firm.Latitude || 0);
                const firmLng = parseFloat(firm.Longitude || 0);
                
                // Map firm to predefined category based on firm name
                let category = 'Other';
                for (const cat of CONSULTING_CATEGORIES) {
                    if (firmName && firmName.toLowerCase().includes(cat.toLowerCase())) {
                        category = cat;
                        break;
                    }
                }
                
                return {
                    id: firm.ID || firm.id || Math.random().toString(36).substr(2, 9),
                    name: firmName,
                    category: category,
                    location: 'Location not specified',
                    coordinates: [firmLat, firmLng],
                    description: 'Consulting firm',
                    website: '',
                    employees: '',
                    founded: '',
                    address: '',
                    phone: '',
                    email: ''
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

// Add firms to the map
function addFirmsToMap() {
    currentFirmData.forEach(firm => {
        const category = firm.category;
        
        if (!layers[category]) {
            layers[category] = L.layerGroup();
        }

        // Create custom icon based on category
        const icon = createCategoryIcon(category);
        
        // Create marker
        const marker = L.marker(firm.coordinates, { icon })
            .bindPopup(createPopupContent(firm))
            .on('click', () => showFirmDetails(firm));

        // Add marker to appropriate layer
        layers[category].addLayer(marker);
        
        // Store marker reference
        if (!markers[category]) {
            markers[category] = [];
        }
        markers[category].push(marker);
    });

    // Add all layers to map initially
    Object.values(layers).forEach(layer => {
        map.addLayer(layer);
    });
    
    // Update layer controls with actual data
    populateLayerControls();
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
            <p><strong>Firm:</strong> ${firm.name}</p>
            <p><strong>Location:</strong> ${firm.location}</p>
            <p><strong>Employees:</strong> ${firm.employees}</p>
            <p><strong>Founded:</strong> ${firm.founded}</p>
            <p>${firm.description}</p>
            <a href="${firm.website}" target="_blank" class="website-link">Visit Website</a>
        </div>
    `;
}

// Show firm details in sidebar
function showFirmDetails(firm) {
    firmDetails.innerHTML = `
        <h4>${firm.name}</h4>
        <p><strong>Firm:</strong> ${firm.name}</p>
        <p><strong>Location:</strong> ${firm.location}</p>
        <p><strong>Employees:</strong> ${firm.employees}</p>
        <p><strong>Founded:</strong> ${firm.founded}</p>
        <p><strong>Description:</strong></p>
        <p>${firm.description}</p>
        <a href="${firm.website}" target="_blank" class="website-link">Visit Website</a>
    `;
}

// Populate layer controls
function populateLayerControls() {
    layerCheckboxes.innerHTML = '';
    
    Object.keys(layers).forEach(category => {
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
        map.addLayer(layers[category]);
    } else {
        map.removeLayer(layers[category]);
    }
}

// Select all layers
function selectAllLayers() {
    const checkboxes = layerCheckboxes.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        const category = checkbox.id.replace('layer-', '');
        map.addLayer(layers[category]);
    });
}

// Clear all layers
function clearAllLayers() {
    const checkboxes = layerCheckboxes.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        const category = checkbox.id.replace('layer-', '');
        map.removeLayer(layers[category]);
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
