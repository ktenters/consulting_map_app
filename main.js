// Import Leaflet from CDN (loaded in HTML)
// import L from 'leaflet';
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

// Check if Leaflet is available
if (typeof L === 'undefined') {
    console.error('Leaflet is not loaded. Please check the CDN link in index.html');
}

// Initialize Supabase client
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

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
    
    if (password === config.SITE_PASSWORD) {
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
            .from(config.TABLE_NAME)
            .select('*');
        
        if (error) {
            console.warn('Supabase query failed, using sample data:', error);
            throw error;
        }
        
        if (data && data.length > 0) {
            // Transform Supabase data to match our expected format
            currentFirmData = data.map(firm => ({
                id: firm.id,
                name: firm.name || firm['Company Name'],
                category: firm.category || firm.Category,
                industry: firm.industry || firm.Industry,
                location: firm.location || firm.Location,
                coordinates: [
                    parseFloat(firm.latitude || firm.Latitude || 0),
                    parseFloat(firm.longitude || firm.Longitude || 0)
                ],
                description: firm.description || firm.Description || '',
                website: firm.website || firm.Website || '',
                employees: firm.employees || firm['Employee Count'] || '',
                founded: firm.founded || firm['Founded Year'] || '',
                address: firm.address || firm.Address || '',
                phone: firm.phone || firm.Phone || '',
                email: firm.email || firm.Email || ''
            })).filter(firm => 
                firm.coordinates[0] !== 0 && 
                firm.coordinates[1] !== 0 && 
                firm.name
            );
            
            console.log('Loaded firm data from Supabase:', currentFirmData.length, 'firms');
        } else {
            throw new Error('No data found in Supabase');
        }
        
        // Fallback to sample data if no valid data found
        if (currentFirmData.length === 0) {
            throw new Error('No valid firm data found');
        }
        
        // Group firms by category
        const categories = [...new Set(currentFirmData.map(firm => firm.category))];
        categories.forEach(category => {
            layers[category] = L.layerGroup();
        });
        
    } catch (error) {
        console.warn('Using sample data due to:', error.message);
        
        // Sample data structure for demonstration
        currentFirmData = [
            {
                id: 1,
                name: 'Tech Solutions Inc.',
                category: 'Technology',
                industry: 'Software',
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
                category: 'Manufacturing',
                industry: 'Industrial',
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
                category: 'Healthcare',
                industry: 'Medical',
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
                category: 'Finance',
                industry: 'Banking',
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
                category: 'Energy',
                industry: 'Renewable',
                location: 'Houston, TX',
                coordinates: [29.7604, -95.3698],
                description: 'Renewable energy company focused on solar and wind power.',
                website: 'https://energysolutions.com',
                employees: '100-500',
                founded: '2012'
            }
        ];
        
        // Group firms by category for sample data
        const categories = [...new Set(currentFirmData.map(firm => firm.category))];
        categories.forEach(category => {
            layers[category] = L.layerGroup();
        });
    }
}

// Initialize Leaflet map
function initializeMap() {
           // Create map centered on US
           map = L.map('map', {
               center: config.DEFAULT_CENTER,
               zoom: config.DEFAULT_ZOOM,
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
    const colors = {
        'Technology': '#00a0dc',
        'Manufacturing': '#1f4e79',
        'Healthcare': '#0073aa',
        'Finance': '#d4af37',
        'Energy': '#28a745'
    };
    
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${colors[category] || '#666'};
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
            <p><strong>Industry:</strong> ${firm.industry}</p>
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
        <p><strong>Category:</strong> ${firm.category}</p>
        <p><strong>Industry:</strong> ${firm.industry}</p>
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
        const firmCount = markers[category] ? markers[category].length : 0;
        
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'layer-checkbox';
        checkboxDiv.innerHTML = `
            <input type="checkbox" id="layer-${category}" checked>
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
    map.setView(config.DEFAULT_CENTER, config.DEFAULT_ZOOM);
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
