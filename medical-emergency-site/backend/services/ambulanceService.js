const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class AmbulanceService {
    constructor() {
        // In a real system, this would connect to ambulance dispatch systems
        this.dispatchCenters = [
            {
                id: 'DC001',
                name: 'Central Emergency Dispatch',
                phone: '+1-555-AMBULANCE',
                coverage: { radius: 50000 }, // 50km radius
                location: { latitude: 40.7128, longitude: -74.0060 } // NYC example
            }
        ];
        
        this.ambulanceUnits = [
            {
                id: 'AMB001',
                unit: 'Unit Alpha-1',
                status: 'available',
                location: { latitude: 40.7580, longitude: -73.9855 },
                equipment: ['AED', 'Oxygen', 'Stretcher', 'IV Kit'],
                crew: [
                    { name: 'John Smith', role: 'Paramedic', certification: 'EMT-P' },
                    { name: 'Sarah Johnson', role: 'EMT', certification: 'EMT-B' }
                ]
            },
            {
                id: 'AMB002',
                unit: 'Unit Beta-2',
                status: 'available',
                location: { latitude: 40.7505, longitude: -73.9934 },
                equipment: ['AED', 'Oxygen', 'Stretcher', 'IV Kit', 'Cardiac Monitor'],
                crew: [
                    { name: 'Mike Wilson', role: 'Paramedic', certification: 'EMT-P' },
                    { name: 'Lisa Brown', role: 'Paramedic', certification: 'EMT-P' }
                ]
            }
        ];
    }

    /**
     * Request ambulance dispatch for emergency
     */
    async requestAmbulance(emergencyId, location, severity, emergencyType) {
        try {
            logger.ambulance('DISPATCH_REQUEST', `Requesting ambulance for emergency ${emergencyId}`, {
                location,
                severity,
                emergencyType
            });

            // Find nearest available ambulance
            const nearestAmbulance = this.findNearestAvailableAmbulance(location);
            
            if (!nearestAmbulance) {
                logger.warn(`No available ambulances for emergency ${emergencyId}`);
                return {
                    success: false,
                    message: 'No ambulances currently available',
                    dispatchPhone: this.dispatchCenters[0].phone,
                    estimatedArrival: 'Pending dispatch confirmation'
                };
            }

            // Calculate ETA
            const distance = this.calculateDistance(
                location.latitude, location.longitude,
                nearestAmbulance.location.latitude, nearestAmbulance.location.longitude
            );
            
            const estimatedArrival = this.calculateETA(distance, severity);

            // Dispatch ambulance
            const dispatch = await this.dispatchAmbulance(
                nearestAmbulance,
                emergencyId,
                location,
                severity,
                emergencyType
            );

            logger.ambulance(nearestAmbulance.id, `Dispatched to emergency ${emergencyId}`, {
                eta: estimatedArrival,
                distance: distance
            });

            return {
                success: true,
                ambulanceId: nearestAmbulance.id,
                unit: nearestAmbulance.unit,
                estimatedArrival: `${estimatedArrival} minutes`,
                dispatchPhone: this.dispatchCenters[0].phone,
                crew: nearestAmbulance.crew,
                equipment: nearestAmbulance.equipment,
                dispatchTime: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Ambulance dispatch error:', error);
            return {
                success: false,
                message: 'Ambulance dispatch failed',
                dispatchPhone: this.dispatchCenters[0].phone
            };
        }
    }

    /**
     * Find nearest available ambulance
     */
    findNearestAvailableAmbulance(location) {
        const availableUnits = this.ambulanceUnits.filter(unit => unit.status === 'available');
        
        if (availableUnits.length === 0) {
            return null;
        }

        let nearest = null;
        let minDistance = Infinity;

        availableUnits.forEach(unit => {
            const distance = this.calculateDistance(
                location.latitude, location.longitude,
                unit.location.latitude, unit.location.longitude
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearest = unit;
            }
        });

        return nearest;
    }

    /**
     * Dispatch ambulance to emergency
     */
    async dispatchAmbulance(ambulance, emergencyId, location, severity, emergencyType) {
        try {
            // Update ambulance status
            ambulance.status = 'dispatched';
            ambulance.currentEmergency = {
                emergencyId,
                location,
                severity,
                emergencyType,
                dispatchTime: new Date()
            };

            // In a real system, this would:
            // 1. Send dispatch notification to ambulance crew
            // 2. Update GPS tracking system
            // 3. Notify hospital of incoming patient
            // 4. Coordinate with traffic control if needed

            // Simulate dispatch process
            setTimeout(() => {
                this.updateAmbulanceStatus(ambulance.id, 'en_route');
            }, 2000);

            return {
                success: true,
                dispatchId: uuidv4(),
                ambulanceId: ambulance.id,
                dispatchTime: new Date()
            };

        } catch (error) {
            logger.error('Error dispatching ambulance:', error);
            throw error;
        }
    }

    /**
     * Update ambulance status
     */
    updateAmbulanceStatus(ambulanceId, newStatus, location = null) {
        const ambulance = this.ambulanceUnits.find(unit => unit.id === ambulanceId);
        
        if (ambulance) {
            ambulance.status = newStatus;
            if (location) {
                ambulance.location = location;
            }
            
            logger.ambulance(ambulanceId, `Status updated to ${newStatus}`, {
                location: ambulance.location
            });
        }
    }

    /**
     * Get ambulance location and status
     */
    getAmbulanceStatus(ambulanceId) {
        const ambulance = this.ambulanceUnits.find(unit => unit.id === ambulanceId);
        
        if (!ambulance) {
            return null;
        }

        return {
            id: ambulance.id,
            unit: ambulance.unit,
            status: ambulance.status,
            location: ambulance.location,
            crew: ambulance.crew,
            equipment: ambulance.equipment,
            currentEmergency: ambulance.currentEmergency,
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * Calculate distance between two points (Haversine formula)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c; // Distance in meters
    }

    /**
     * Convert degrees to radians
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Calculate estimated time of arrival
     */
    calculateETA(distance, severity) {
        // Base speed in km/h
        let averageSpeed = 60; // Normal traffic
        
        // Adjust speed based on severity (emergency vehicles can go faster for critical cases)
        switch(severity) {
            case 'critical':
                averageSpeed = 80; // High priority, use sirens
                break;
            case 'urgent':
                averageSpeed = 70; // Medium priority
                break;
            case 'moderate':
                averageSpeed = 60; // Normal priority
                break;
        }

        // Convert distance to km and calculate time
        const distanceKm = distance / 1000;
        const timeHours = distanceKm / averageSpeed;
        const timeMinutes = Math.ceil(timeHours * 60);

        // Add buffer time for preparation and traffic
        return Math.max(timeMinutes + 2, 5); // Minimum 5 minutes
    }

    /**
     * Get all ambulance statuses (for dispatch dashboard)
     */
    getAllAmbulanceStatuses() {
        return this.ambulanceUnits.map(unit => ({
            id: unit.id,
            unit: unit.unit,
            status: unit.status,
            location: unit.location,
            currentEmergency: unit.currentEmergency || null,
            crew: unit.crew.length,
            lastUpdate: new Date().toISOString()
        }));
    }

    /**
     * Reserve ambulance for emergency
     */
    reserveAmbulance(ambulanceId, emergencyId) {
        const ambulance = this.ambulanceUnits.find(unit => unit.id === ambulanceId);
        
        if (!ambulance) {
            throw new Error('Ambulance not found');
        }

        if (ambulance.status !== 'available') {
            throw new Error('Ambulance not available');
        }

        ambulance.status = 'reserved';
        ambulance.reservedFor = emergencyId;
        ambulance.reservationTime = new Date();

        logger.ambulance(ambulanceId, `Reserved for emergency ${emergencyId}`);

        return {
            success: true,
            ambulanceId,
            reservationTime: ambulance.reservationTime
        };
    }

    /**
     * Release ambulance reservation
     */
    releaseAmbulance(ambulanceId) {
        const ambulance = this.ambulanceUnits.find(unit => unit.id === ambulanceId);
        
        if (ambulance) {
            ambulance.status = 'available';
            delete ambulance.currentEmergency;
            delete ambulance.reservedFor;
            delete ambulance.reservationTime;

            logger.ambulance(ambulanceId, 'Released and available for dispatch');
        }
    }

    /**
     * Simulate ambulance movement (for demo purposes)
     */
    simulateAmbulanceMovement(ambulanceId, destinationLat, destinationLon) {
        const ambulance = this.ambulanceUnits.find(unit => unit.id === ambulanceId);
        
        if (!ambulance) return;

        const updateInterval = 10000; // Update every 10 seconds
        const totalSteps = 10; // Number of updates to reach destination
        
        let currentStep = 0;
        const startLat = ambulance.location.latitude;
        const startLon = ambulance.location.longitude;

        const interval = setInterval(() => {
            currentStep++;
            
            // Linear interpolation for demo
            const progress = currentStep / totalSteps;
            ambulance.location.latitude = startLat + (destinationLat - startLat) * progress;
            ambulance.location.longitude = startLon + (destinationLon - startLon) * progress;

            logger.ambulance(ambulanceId, `Location updated`, {
                location: ambulance.location,
                progress: `${Math.round(progress * 100)}%`
            });

            if (currentStep >= totalSteps) {
                clearInterval(interval);
                this.updateAmbulanceStatus(ambulanceId, 'arrived');
            }
        }, updateInterval);
    }
}

module.exports = new AmbulanceService();