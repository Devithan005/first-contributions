// Global variables
let currentStep = 1;
let userLocation = null;
let emergencyData = {};

// DOM elements
const steps = document.querySelectorAll('.step');
const phoneForm = document.getElementById('phoneForm');
const emergencyForm = document.getElementById('emergencyForm');
const getLocationBtn = document.getElementById('getLocation');
const locationInput = document.getElementById('location');
const loadingOverlay = document.getElementById('loadingOverlay');
const hospitalResults = document.getElementById('hospitalResults');
const newEmergencyBtn = document.getElementById('newEmergency');

// API base URL - adjust for your deployment
const API_BASE_URL = 'http://localhost:3000/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Phone form submission
    phoneForm.addEventListener('submit', handlePhoneSubmission);
    
    // Emergency form submission
    emergencyForm.addEventListener('submit', handleEmergencySubmission);
    
    // Get location button
    getLocationBtn.addEventListener('click', getCurrentLocation);
    
    // New emergency button
    newEmergencyBtn.addEventListener('click', resetToStart);
    
    // Auto-get location on page load
    getCurrentLocation();
}

// Handle phone number submission
async function handlePhoneSubmission(e) {
    e.preventDefault();
    
    const phoneNumber = document.getElementById('phone').value;
    
    if (!phoneNumber) {
        showAlert('Please enter a valid phone number', 'error');
        return;
    }
    
    try {
        showLoading('Verifying phone number...');
        
        const response = await fetch(`${API_BASE_URL}/verify-phone`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phoneNumber })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            emergencyData.phoneNumber = phoneNumber;
            emergencyData.sessionId = result.sessionId;
            goToStep(2);
        } else {
            showAlert(result.message || 'Phone verification failed', 'error');
        }
    } catch (error) {
        console.error('Phone verification error:', error);
        showAlert('Connection error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Handle emergency form submission
async function handleEmergencySubmission(e) {
    e.preventDefault();
    
    const formData = new FormData(emergencyForm);
    const data = Object.fromEntries(formData.entries());
    
    // Validate required fields
    if (!data.name || !data['emergency-type'] || !data.description || !data.severity) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }
    
    if (!userLocation) {
        showAlert('Please enable location tracking or enter your location manually', 'error');
        return;
    }
    
    try {
        showLoading('Finding nearest equipped hospitals...');
        
        // Prepare emergency data
        const emergencyRequest = {
            ...emergencyData,
            patientName: data.name,
            location: userLocation,
            emergencyType: data['emergency-type'],
            description: data.description,
            severity: data.severity,
            timestamp: new Date().toISOString()
        };
        
        const response = await fetch(`${API_BASE_URL}/emergency/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emergencyRequest)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            emergencyData.emergencyId = result.emergencyId;
            displayResults(result);
            goToStep(3);
        } else {
            showAlert(result.message || 'Emergency submission failed', 'error');
        }
    } catch (error) {
        console.error('Emergency submission error:', error);
        showAlert('Connection error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Get current location
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showAlert('Geolocation is not supported by this browser', 'error');
        return;
    }
    
    getLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';
    getLocationBtn.disabled = true;
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            userLocation = {
                latitude: lat,
                longitude: lng,
                accuracy: position.coords.accuracy
            };
            
            try {
                // Reverse geocoding to get address
                const response = await fetch(`${API_BASE_URL}/geocode/reverse`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ latitude: lat, longitude: lng })
                });
                
                const result = await response.json();
                
                if (response.ok && result.address) {
                    locationInput.value = result.address;
                    userLocation.address = result.address;
                } else {
                    locationInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                }
                
                showAlert('Location detected successfully', 'success');
            } catch (error) {
                console.error('Geocoding error:', error);
                locationInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                showAlert('Location detected (address lookup failed)', 'warning');
            }
            
            getLocationBtn.innerHTML = '<i class="fas fa-check"></i> Location Found';
            getLocationBtn.disabled = false;
        },
        (error) => {
            console.error('Geolocation error:', error);
            let message = 'Unable to get location. ';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    message += 'Please enable location permissions.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message += 'Location information unavailable.';
                    break;
                case error.TIMEOUT:
                    message += 'Location request timed out.';
                    break;
                default:
                    message += 'Unknown location error.';
                    break;
            }
            
            showAlert(message, 'error');
            getLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Try Again';
            getLocationBtn.disabled = false;
            
            // Allow manual location entry
            locationInput.readOnly = false;
            locationInput.placeholder = 'Enter your address manually';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

// Display emergency results
function displayResults(data) {
    // Update status
    updateStatus();
    
    // Update contacts
    document.getElementById('ambulanceContact').textContent = data.ambulanceContact || '+1-555-AMBULANCE';
    document.getElementById('hospitalContact').textContent = data.hospitalContact || '+1-555-HOSPITAL';
    
    // Display hospitals
    if (data.hospitals && data.hospitals.length > 0) {
        displayHospitals(data.hospitals);
    } else {
        hospitalResults.innerHTML = '<div class="no-results">No equipped hospitals found nearby. Emergency services are coordinating alternative options.</div>';
    }
}

// Display hospital list
function displayHospitals(hospitals) {
    hospitalResults.innerHTML = '';
    
    hospitals.forEach((hospital, index) => {
        const hospitalCard = createHospitalCard(hospital, index === 0);
        hospitalResults.appendChild(hospitalCard);
    });
}

// Create hospital card element
function createHospitalCard(hospital, isBestMatch = false) {
    const card = document.createElement('div');
    card.className = `hospital-card ${isBestMatch ? 'best-match' : ''}`;
    
    card.innerHTML = `
        <div class="hospital-header">
            <div>
                <div class="hospital-name">${hospital.name}</div>
                ${isBestMatch ? '<div style="color: #27ae60; font-weight: 600; font-size: 0.9rem;">🏆 Best Match</div>' : ''}
            </div>
            <div class="hospital-distance">${hospital.distance}</div>
        </div>
        
        <div class="hospital-info">
            <div class="info-item">
                <i class="fas fa-clock"></i>
                <span>ETA: ${hospital.eta}</span>
            </div>
            <div class="info-item">
                <i class="fas fa-bed"></i>
                <span>Beds: ${hospital.availableBeds}</span>
            </div>
            <div class="info-item">
                <i class="fas fa-phone"></i>
                <span>${hospital.phone}</span>
            </div>
            <div class="info-item">
                <i class="fas fa-map-marker-alt"></i>
                <span>${hospital.address}</span>
            </div>
        </div>
        
        <div class="specialties">
            ${hospital.specialties.map(specialty => 
                `<span class="specialty-tag ${hospital.emergencyMatch ? 'emergency-match' : ''}">${specialty}</span>`
            ).join('')}
        </div>
    `;
    
    return card;
}

// Update status indicators
function updateStatus() {
    setTimeout(() => {
        const processingItem = document.querySelector('.status-item.processing');
        if (processingItem) {
            processingItem.classList.remove('processing');
            processingItem.classList.add('completed');
        }
        
        const pendingItems = document.querySelectorAll('.status-item.pending');
        if (pendingItems.length > 0) {
            pendingItems[0].classList.remove('pending');
            pendingItems[0].classList.add('processing');
        }
    }, 2000);
    
    setTimeout(() => {
        const processingItem = document.querySelector('.status-item.processing');
        if (processingItem) {
            processingItem.classList.remove('processing');
            processingItem.classList.add('completed');
        }
    }, 4000);
}

// Navigation functions
function goToStep(stepNumber) {
    steps.forEach(step => step.classList.remove('active'));
    document.getElementById(`step${stepNumber}`).classList.add('active');
    currentStep = stepNumber;
}

function resetToStart() {
    currentStep = 1;
    emergencyData = {};
    userLocation = null;
    
    // Reset forms
    phoneForm.reset();
    emergencyForm.reset();
    locationInput.value = '';
    locationInput.readOnly = true;
    
    // Reset location button
    getLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Get My Location';
    getLocationBtn.disabled = false;
    
    // Reset status items
    document.querySelectorAll('.status-item').forEach((item, index) => {
        item.classList.remove('completed', 'processing', 'pending');
        if (index < 2) {
            item.classList.add('completed');
        } else if (index === 2) {
            item.classList.add('processing');
        } else {
            item.classList.add('pending');
        }
    });
    
    goToStep(1);
}

// Utility functions
function showLoading(message = 'Loading...') {
    const spinner = loadingOverlay.querySelector('p');
    spinner.textContent = message;
    loadingOverlay.classList.add('show');
}

function hideLoading() {
    loadingOverlay.classList.remove('show');
}

function showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${getAlertIcon(type)}"></i>
        <span>${message}</span>
        <button class="alert-close">&times;</button>
    `;
    
    // Add styles
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getAlertColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1001;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add close functionality
    const closeBtn = alert.querySelector('.alert-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: 0.5rem;
    `;
    
    closeBtn.onclick = () => alert.remove();
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

function getAlertIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

function getAlertColor(type) {
    switch(type) {
        case 'success': return '#27ae60';
        case 'error': return '#e74c3c';
        case 'warning': return '#f39c12';
        default: return '#3498db';
    }
}

// Add slide-in animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);