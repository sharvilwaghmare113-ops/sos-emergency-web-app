// Emergency SOS Web Application - Frontend JavaScript

// ============ CONFIGURATION ============
const API_BASE_URL = 'http://localhost:5000/api';
const STORAGE_KEY = 'emergency_sos_contacts';

// ============ DOM ELEMENTS ============
const sosButton = document.getElementById('sosButton');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const locationContainer = document.getElementById('locationContainer');
const locationCoords = document.getElementById('locationCoords');
const mapsLink = document.getElementById('mapsLink');
const contactName = document.getElementById('contactName');
const contactPhone = document.getElementById('contactPhone');
const addContactBtn = document.getElementById('addContactBtn');
const contactsList = document.getElementById('contactsList');
const noContacts = document.getElementById('noContacts');

// ============ STATE ============
let contacts = [];
let isSending = false;

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚨 Emergency SOS App Initialized');
    loadContactsFromStorage();
    renderContacts();
    setupEventListeners();
    checkServerHealth();
});

// ============ EVENT LISTENERS ============
function setupEventListeners() {
    // SOS Button
    sosButton.addEventListener('click', handleSOS);
    
    // Add Contact Button
    addContactBtn.addEventListener('click', addContact);
    
    // Enter key to add contact
    contactPhone.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addContact();
        }
    });
}

// ============ SERVER HEALTH CHECK ============
async function checkServerHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        console.log('✅ Server health:', data);
    } catch (error) {
        console.warn('⚠️  Server not reachable:', error.message);
    }
}

// ============ CONTACTS MANAGEMENT ============

// Load contacts from localStorage
function loadContactsFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            contacts = JSON.parse(stored);
            console.log('📱 Contacts loaded from localStorage:', contacts.length);
        }
    } catch (error) {
        console.error('❌ Error loading contacts from localStorage:', error);
        contacts = [];
    }
}

// Save contacts to localStorage
function saveContactsToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
        console.log('💾 Contacts saved to localStorage');
    } catch (error) {
        console.error('❌ Error saving contacts to localStorage:', error);
    }
}

// Sync contacts to backend (MongoDB)
async function syncContactsToBackend() {
    if (contacts.length === 0) {
        console.log('ℹ️  No contacts to sync');
        return;
    }

    try {
        console.log('📤 Syncing contacts to backend...');
        const response = await fetch(`${API_BASE_URL}/contacts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contacts })
        });

        const data = await response.json();
        console.log('✅ Contacts synced to backend:', data);
        return data;
    } catch (error) {
        console.error('❌ Error syncing contacts to backend:', error);
        throw error;
    }
}

// Add new contact
function addContact() {
    const name = contactName.value.trim();
    const phone = contactPhone.value.trim();

    // Validate inputs
    if (!name) {
        alert('Please enter a contact name');
        return;
    }

    if (!phone) {
        alert('Please enter a phone number');
        return;
    }

    // Validate phone format (basic)
    if (!/^\+?[\d\s-]{10,}$/.test(phone)) {
        alert('Please enter a valid phone number (at least 10 digits)');
        return;
    }

    // Check for duplicate
    const exists = contacts.some(c => c.phone === phone);
    if (exists) {
        alert('This phone number is already in your contacts');
        return;
    }

    // Add to contacts array
    const newContact = {
        id: Date.now(),
        name,
        phone
    };

    contacts.push(newContact);
    console.log('➕ Contact added:', newContact);

    // Save to localStorage
    saveContactsToStorage();

    // Sync to backend
    syncContactsToBackend().catch(err => {
        console.warn('⚠️  Contact saved locally but failed to sync to server');
    });

    // Clear inputs
    contactName.value = '';
    contactPhone.value = '';

    // Re-render contacts
    renderContacts();
}

// Delete contact
function deleteContact(id) {
    contacts = contacts.filter(c => c.id !== id);
    console.log('🗑️ Contact deleted, ID:', id);

    // Save to localStorage
    saveContactsToStorage();

    // Sync to backend
    syncContactsToBackend().catch(err => {
        console.warn('⚠️  Contact removed locally but failed to sync to server');
    });

    // Re-render contacts
    renderContacts();
}

// Render contacts list
function renderContacts() {
    // Clear current list
    contactsList.innerHTML = '';

    if (contacts.length === 0) {
        contactsList.innerHTML = '<p class="no-contacts">No emergency contacts added yet</p>';
        return;
    }

    // Render each contact
    contacts.forEach(contact => {
        const card = document.createElement('div');
        card.className = 'contact-card';
        card.innerHTML = `
            <div class="contact-info">
                <span class="contact-name">${escapeHtml(contact.name)}</span>
                <span class="contact-phone">${escapeHtml(contact.phone)}</span>
            </div>
            <button class="delete-btn" onclick="deleteContact(${contact.id})" title="Delete contact">
                ✕
            </button>
        `;
        contactsList.appendChild(card);
    });

    console.log('📋 Contacts rendered:', contacts.length);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ SOS FUNCTIONALITY ============

// Handle SOS button click
async function handleSOS() {
    if (isSending) {
        console.log('⚠️  SOS already in progress');
        return;
    }

    // Prevent multiple clicks
    isSending = true;
    sosButton.classList.add('sending');

    try {
        // Step 1: Get location
        updateStatus('Getting location...', 'warning');
        
        const location = await getUserLocation();
        
        if (!location) {
            throw new Error('Failed to get location');
        }

        // Step 2: Display location
        displayLocation(location);

        // Step 3: Send SOS to backend
        updateStatus('Sending SOS...', 'warning');
        
        const response = await sendSOS(location);

        // Step 4: Success
        updateStatus('Success! SMS sent to ' + contacts.length + ' contacts', 'success');
        console.log('✅ SOS sent successfully:', response);

    } catch (error) {
        console.error('❌ SOS Error:', error);
        updateStatus('Error: ' + error.message, 'error');
    } finally {
        // Re-enable button after delay
        setTimeout(() => {
            isSending = false;
            sosButton.classList.remove('sending');
            if (!statusText.textContent.includes('Success')) {
                updateStatus('Ready', 'ready');
            }
        }, 5000);
    }
}

// Get user location using Geolocation API
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                console.log('📍 Location obtained:', location);
                resolve(location);
            },
            (error) => {
                console.error('❌ Geolocation error:', error);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        reject(new Error('Location permission denied'));
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject(new Error('Location unavailable'));
                        break;
                    case error.TIMEOUT:
                        reject(new Error('Location request timed out'));
                        break;
                    default:
                        reject(new Error('Unknown location error'));
                }
            },
            options
        );
    });
}

// Display location on UI
function displayLocation(location) {
    const { lat, lng } = location;
    
    // Update coordinates
    locationCoords.textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
    
    // Update maps link
    const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
    mapsLink.href = mapsUrl;
    mapsLink.target = '_blank';
    
    // Show location container
    locationContainer.style.display = 'block';
}

// Send SOS to backend
async function sendSOS(location) {
    const payload = {
        lat: location.lat,
        lng: location.lng,
        contacts: contacts
    };

    console.log('📤 Sending SOS payload:', payload);

    const response = await fetch(`${API_BASE_URL}/sos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send SOS');
    }

    const data = await response.json();
    return data;
}

// Update status display
function updateStatus(message, type) {
    statusText.textContent = message;
    
    // Reset classes
    statusIndicator.className = 'status-indicator';
    
    // Add appropriate class
    if (type === 'warning') {
        statusIndicator.classList.add('warning');
    } else if (type === 'error') {
        statusIndicator.classList.add('error');
    } else if (type === 'success') {
        statusIndicator.classList.add('success');
    }
    
    console.log('📊 Status update:', message, '(' + type + ')');
}

// ============ UTILITY FUNCTIONS ============

// Make deleteContact available globally
window.deleteContact = deleteContact;

// Console banner
console.log(`
🚨 ========================================
   EMERGENCY SOS - FRONTEND LOADED
   Version: 1.0.0
   API: ${API_BASE_URL}
   Contacts in storage: ${contacts.length}
🚨 ========================================
`);
