const Hospital = require('../models/Hospital');
const logger = require('../utils/logger');

class HospitalService {
    /**
     * Find nearby hospitals based on location and emergency type
     */
    async findNearbyHospitals(longitude, latitude, emergencyType, severity, maxDistance = 50000) {
        try {
            logger.info(`Finding hospitals near ${latitude}, ${longitude} for ${emergencyType} emergency`);

            // Find hospitals within radius
            const hospitals = await Hospital.find({
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [longitude, latitude]
                        },
                        $maxDistance: maxDistance
                    }
                },
                status: 'Active',
                'capacity.availableBeds': { $gt: 0 }
            }).limit(20);

            if (hospitals.length === 0) {
                logger.warn(`No hospitals found within ${maxDistance}m of ${latitude}, ${longitude}`);
                return [];
            }

            // Calculate scores and distances for each hospital
            const scoredHospitals = hospitals.map(hospital => {
                const distance = this.calculateDistance(latitude, longitude, 
                    hospital.location.coordinates[1], hospital.location.coordinates[0]);
                
                const emergencyScore = hospital.calculateEmergencyScore(emergencyType, severity);
                const distanceScore = this.calculateDistanceScore(distance, maxDistance);
                const capacityScore = this.calculateCapacityScore(hospital);
                
                // Weighted final score
                const finalScore = (emergencyScore * 0.4) + (distanceScore * 0.3) + (capacityScore * 0.3);

                return {
                    hospital,
                    distance,
                    score: Math.round(finalScore),
                    emergencyScore,
                    distanceScore,
                    capacityScore
                };
            });

            // Sort by score (highest first)
            scoredHospitals.sort((a, b) => b.score - a.score);

            logger.info(`Found ${scoredHospitals.length} hospitals, best match: ${scoredHospitals[0].hospital.name} (score: ${scoredHospitals[0].score})`);

            return scoredHospitals;

        } catch (error) {
            logger.error('Error finding nearby hospitals:', error);
            throw new Error('Hospital search failed');
        }
    }

    /**
     * Calculate distance between two points using Haversine formula
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
     * Calculate distance score (closer hospitals get higher scores)
     */
    calculateDistanceScore(distance, maxDistance) {
        if (distance >= maxDistance) return 0;
        return Math.max(0, 100 - (distance / maxDistance * 100));
    }

    /**
     * Calculate capacity score based on available beds and resources
     */
    calculateCapacityScore(hospital) {
        let score = 0;
        
        // Available beds score
        const bedUtilization = hospital.capacity.availableBeds / hospital.capacity.totalBeds;
        score += bedUtilization * 30;
        
        // Emergency room availability
        if (hospital.capacity.availableEmergencyRooms > 0) {
            score += 25;
        }
        
        // ICU availability
        if (hospital.capacity.availableIcuBeds > 0) {
            score += 20;
        }
        
        // Equipment availability
        if (hospital.equipment.ctScan) score += 5;
        if (hospital.equipment.mriMachine) score += 5;
        if (hospital.equipment.ventilators > 0) score += 5;
        if (hospital.equipment.defibrillators > 0) score += 5;
        if (hospital.equipment.bloodBank) score += 5;
        
        return Math.min(score, 100);
    }

    /**
     * Update hospital capacity in real-time
     */
    async updateHospitalCapacity(hospitalId, capacityData) {
        try {
            const hospital = await Hospital.findById(hospitalId);
            if (!hospital) {
                throw new Error('Hospital not found');
            }

            await hospital.updateCapacity(capacityData);
            
            logger.info(`Updated capacity for ${hospital.name}: ${JSON.stringify(capacityData)}`);
            
            return hospital;

        } catch (error) {
            logger.error('Error updating hospital capacity:', error);
            throw error;
        }
    }

    /**
     * Get hospital by ID with full details
     */
    async getHospitalById(hospitalId) {
        try {
            const hospital = await Hospital.findById(hospitalId);
            if (!hospital) {
                throw new Error('Hospital not found');
            }
            return hospital;
        } catch (error) {
            logger.error('Error fetching hospital:', error);
            throw error;
        }
    }

    /**
     * Get hospitals by specialty
     */
    async getHospitalsBySpecialty(specialty, latitude = null, longitude = null, maxDistance = 50000) {
        try {
            let query = {
                specialties: specialty,
                status: 'Active'
            };

            let hospitals;
            
            if (latitude && longitude) {
                hospitals = await Hospital.find({
                    ...query,
                    location: {
                        $near: {
                            $geometry: {
                                type: 'Point',
                                coordinates: [longitude, latitude]
                            },
                            $maxDistance: maxDistance
                        }
                    }
                });
            } else {
                hospitals = await Hospital.find(query);
            }

            return hospitals;

        } catch (error) {
            logger.error('Error fetching hospitals by specialty:', error);
            throw error;
        }
    }

    /**
     * Check hospital availability for emergency type
     */
    async checkAvailability(hospitalId, emergencyType) {
        try {
            const hospital = await Hospital.findById(hospitalId);
            if (!hospital) {
                return { available: false, reason: 'Hospital not found' };
            }

            if (hospital.status !== 'Active') {
                return { available: false, reason: 'Hospital not active' };
            }

            if (hospital.capacity.availableBeds === 0) {
                return { available: false, reason: 'No available beds' };
            }

            if (!hospital.canHandleEmergency(emergencyType)) {
                return { 
                    available: false, 
                    reason: `Hospital not equipped for ${emergencyType} emergencies` 
                };
            }

            return {
                available: true,
                capacity: hospital.capacity,
                estimatedWaitTime: hospital.averageWaitTime,
                emergencyScore: hospital.calculateEmergencyScore(emergencyType, 'urgent')
            };

        } catch (error) {
            logger.error('Error checking hospital availability:', error);
            throw error;
        }
    }

    /**
     * Reserve bed for emergency
     */
    async reserveBed(hospitalId, emergencyId, emergencyType) {
        try {
            const hospital = await Hospital.findById(hospitalId);
            if (!hospital) {
                throw new Error('Hospital not found');
            }

            if (hospital.capacity.availableBeds === 0) {
                throw new Error('No available beds');
            }

            // Reserve a bed (decrease available count)
            hospital.capacity.availableBeds -= 1;
            
            // If it's a critical emergency, also try to reserve ICU bed
            if (emergencyType === 'cardiac' || emergencyType === 'stroke' || emergencyType === 'trauma') {
                if (hospital.capacity.availableIcuBeds > 0) {
                    hospital.capacity.availableIcuBeds -= 1;
                }
            }

            await hospital.save();

            logger.info(`Reserved bed at ${hospital.name} for emergency ${emergencyId}`);

            return {
                success: true,
                hospitalName: hospital.name,
                reservedBedType: 'general',
                reservationTime: new Date()
            };

        } catch (error) {
            logger.error('Error reserving bed:', error);
            throw error;
        }
    }

    /**
     * Get hospital statistics
     */
    async getHospitalStatistics() {
        try {
            const stats = await Hospital.aggregate([
                {
                    $group: {
                        _id: null,
                        totalHospitals: { $sum: 1 },
                        activeHospitals: {
                            $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
                        },
                        totalBeds: { $sum: '$capacity.totalBeds' },
                        availableBeds: { $sum: '$capacity.availableBeds' },
                        totalIcuBeds: { $sum: '$capacity.icuBeds' },
                        availableIcuBeds: { $sum: '$capacity.availableIcuBeds' },
                        traumaCenters: {
                            $sum: { 
                                $cond: [
                                    { $ne: ['$emergencyServices.traumaLevel', 'None'] }, 
                                    1, 
                                    0
                                ] 
                            }
                        },
                        strokeCenters: {
                            $sum: { $cond: ['$emergencyServices.strokeCenter', 1, 0] }
                        },
                        heartAttackCenters: {
                            $sum: { $cond: ['$emergencyServices.heartAttackCenter', 1, 0] }
                        }
                    }
                }
            ]);

            return stats[0] || {};

        } catch (error) {
            logger.error('Error fetching hospital statistics:', error);
            throw error;
        }
    }

    /**
     * Search hospitals by name or location
     */
    async searchHospitals(searchTerm, latitude = null, longitude = null) {
        try {
            let query = {
                $or: [
                    { name: { $regex: searchTerm, $options: 'i' } },
                    { 'address.city': { $regex: searchTerm, $options: 'i' } },
                    { 'address.state': { $regex: searchTerm, $options: 'i' } },
                    { specialties: { $regex: searchTerm, $options: 'i' } }
                ],
                status: 'Active'
            };

            let hospitals;

            if (latitude && longitude) {
                hospitals = await Hospital.find({
                    ...query,
                    location: {
                        $near: {
                            $geometry: {
                                type: 'Point',
                                coordinates: [longitude, latitude]
                            },
                            $maxDistance: 100000 // 100km for search
                        }
                    }
                }).limit(50);
            } else {
                hospitals = await Hospital.find(query).limit(50);
            }

            return hospitals;

        } catch (error) {
            logger.error('Error searching hospitals:', error);
            throw error;
        }
    }
}

module.exports = new HospitalService();