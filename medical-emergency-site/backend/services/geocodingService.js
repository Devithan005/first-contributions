const axios = require('axios');
const logger = require('../utils/logger');

class GeocodingService {
    constructor() {
        this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
        this.providers = ['google', 'nominatim']; // Fallback providers
    }

    /**
     * Reverse geocode - convert coordinates to address
     */
    async reverseGeocode(latitude, longitude) {
        try {
            // Try Google Maps first if API key is available
            if (this.googleApiKey) {
                const googleResult = await this.reverseGeocodeGoogle(latitude, longitude);
                if (googleResult.success) {
                    return googleResult;
                }
            }

            // Fallback to OpenStreetMap Nominatim (free)
            const nominatimResult = await this.reverseGeocodeNominatim(latitude, longitude);
            return nominatimResult;

        } catch (error) {
            logger.error('Reverse geocoding failed:', error);
            return {
                success: false,
                message: 'Geocoding service unavailable'
            };
        }
    }

    /**
     * Forward geocode - convert address to coordinates
     */
    async forwardGeocode(address) {
        try {
            // Try Google Maps first if API key is available
            if (this.googleApiKey) {
                const googleResult = await this.forwardGeocodeGoogle(address);
                if (googleResult.success) {
                    return googleResult;
                }
            }

            // Fallback to OpenStreetMap Nominatim (free)
            const nominatimResult = await this.forwardGeocodeNominatim(address);
            return nominatimResult;

        } catch (error) {
            logger.error('Forward geocoding failed:', error);
            return {
                success: false,
                message: 'Geocoding service unavailable'
            };
        }
    }

    /**
     * Google Maps reverse geocoding
     */
    async reverseGeocodeGoogle(latitude, longitude) {
        try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.googleApiKey}`;
            
            const response = await axios.get(url, { timeout: 5000 });
            
            if (response.data.status === 'OK' && response.data.results.length > 0) {
                const result = response.data.results[0];
                
                return {
                    success: true,
                    address: result.formatted_address,
                    components: this.parseGoogleComponents(result.address_components),
                    confidence: 'high'
                };
            }

            return {
                success: false,
                message: 'Address not found'
            };

        } catch (error) {
            logger.error('Google reverse geocoding error:', error);
            return {
                success: false,
                message: 'Google geocoding failed'
            };
        }
    }

    /**
     * Google Maps forward geocoding
     */
    async forwardGeocodeGoogle(address) {
        try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.googleApiKey}`;
            
            const response = await axios.get(url, { timeout: 5000 });
            
            if (response.data.status === 'OK' && response.data.results.length > 0) {
                const result = response.data.results[0];
                
                return {
                    success: true,
                    coordinates: {
                        latitude: result.geometry.location.lat,
                        longitude: result.geometry.location.lng
                    },
                    formattedAddress: result.formatted_address,
                    confidence: 'high'
                };
            }

            return {
                success: false,
                message: 'Address not found'
            };

        } catch (error) {
            logger.error('Google forward geocoding error:', error);
            return {
                success: false,
                message: 'Google geocoding failed'
            };
        }
    }

    /**
     * OpenStreetMap Nominatim reverse geocoding (free fallback)
     */
    async reverseGeocodeNominatim(latitude, longitude) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
            
            const response = await axios.get(url, { 
                timeout: 5000,
                headers: {
                    'User-Agent': 'Emergency-Care-Locator/1.0'
                }
            });
            
            if (response.data && response.data.display_name) {
                return {
                    success: true,
                    address: response.data.display_name,
                    components: this.parseNominatimComponents(response.data.address),
                    confidence: 'medium'
                };
            }

            return {
                success: false,
                message: 'Address not found'
            };

        } catch (error) {
            logger.error('Nominatim reverse geocoding error:', error);
            return {
                success: false,
                message: 'Nominatim geocoding failed'
            };
        }
    }

    /**
     * OpenStreetMap Nominatim forward geocoding (free fallback)
     */
    async forwardGeocodeNominatim(address) {
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&addressdetails=1&limit=1`;
            
            const response = await axios.get(url, { 
                timeout: 5000,
                headers: {
                    'User-Agent': 'Emergency-Care-Locator/1.0'
                }
            });
            
            if (response.data && response.data.length > 0) {
                const result = response.data[0];
                
                return {
                    success: true,
                    coordinates: {
                        latitude: parseFloat(result.lat),
                        longitude: parseFloat(result.lon)
                    },
                    formattedAddress: result.display_name,
                    confidence: 'medium'
                };
            }

            return {
                success: false,
                message: 'Address not found'
            };

        } catch (error) {
            logger.error('Nominatim forward geocoding error:', error);
            return {
                success: false,
                message: 'Nominatim geocoding failed'
            };
        }
    }

    /**
     * Find nearby places (hospitals, pharmacies, etc.)
     */
    async findNearbyPlaces(latitude, longitude, type = 'hospital', radius = 5000) {
        try {
            if (this.googleApiKey) {
                return await this.findNearbyPlacesGoogle(latitude, longitude, type, radius);
            } else {
                return await this.findNearbyPlacesNominatim(latitude, longitude, type, radius);
            }
        } catch (error) {
            logger.error('Find nearby places error:', error);
            return {
                success: false,
                message: 'Places search failed'
            };
        }
    }

    /**
     * Google Places API nearby search
     */
    async findNearbyPlacesGoogle(latitude, longitude, type, radius) {
        try {
            const typeMap = {
                hospital: 'hospital',
                pharmacy: 'pharmacy',
                clinic: 'doctor',
                emergency: 'hospital'
            };

            const placeType = typeMap[type] || 'hospital';
            const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${placeType}&key=${this.googleApiKey}`;
            
            const response = await axios.get(url, { timeout: 10000 });
            
            if (response.data.status === 'OK') {
                const places = response.data.results.map(place => ({
                    name: place.name,
                    address: place.vicinity,
                    location: {
                        latitude: place.geometry.location.lat,
                        longitude: place.geometry.location.lng
                    },
                    rating: place.rating,
                    types: place.types,
                    placeId: place.place_id
                }));

                return {
                    success: true,
                    places,
                    total: places.length
                };
            }

            return {
                success: false,
                message: 'No places found'
            };

        } catch (error) {
            logger.error('Google Places API error:', error);
            return {
                success: false,
                message: 'Google Places search failed'
            };
        }
    }

    /**
     * Nominatim nearby places search
     */
    async findNearbyPlacesNominatim(latitude, longitude, type, radius) {
        try {
            const typeMap = {
                hospital: 'hospital',
                pharmacy: 'pharmacy',
                clinic: 'clinic',
                emergency: 'hospital'
            };

            const amenity = typeMap[type] || 'hospital';
            const radiusKm = radius / 1000;
            
            const url = `https://nominatim.openstreetmap.org/search?format=json&amenity=${amenity}&bounded=1&viewbox=${longitude - 0.01},${latitude + 0.01},${longitude + 0.01},${latitude - 0.01}&addressdetails=1`;
            
            const response = await axios.get(url, { 
                timeout: 10000,
                headers: {
                    'User-Agent': 'Emergency-Care-Locator/1.0'
                }
            });
            
            if (response.data && response.data.length > 0) {
                const places = response.data.map(place => ({
                    name: place.display_name.split(',')[0],
                    address: place.display_name,
                    location: {
                        latitude: parseFloat(place.lat),
                        longitude: parseFloat(place.lon)
                    },
                    placeId: place.place_id
                }));

                return {
                    success: true,
                    places: places.slice(0, 20), // Limit results
                    total: places.length
                };
            }

            return {
                success: false,
                message: 'No places found'
            };

        } catch (error) {
            logger.error('Nominatim places search error:', error);
            return {
                success: false,
                message: 'Nominatim places search failed'
            };
        }
    }

    /**
     * Parse Google address components
     */
    parseGoogleComponents(components) {
        const parsed = {};
        
        components.forEach(component => {
            const types = component.types;
            
            if (types.includes('street_number')) {
                parsed.streetNumber = component.long_name;
            } else if (types.includes('route')) {
                parsed.street = component.long_name;
            } else if (types.includes('locality')) {
                parsed.city = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
                parsed.state = component.short_name;
            } else if (types.includes('postal_code')) {
                parsed.zipCode = component.long_name;
            } else if (types.includes('country')) {
                parsed.country = component.long_name;
            }
        });

        return parsed;
    }

    /**
     * Parse Nominatim address components
     */
    parseNominatimComponents(address) {
        if (!address) return {};

        return {
            streetNumber: address.house_number,
            street: address.road,
            city: address.city || address.town || address.village,
            state: address.state,
            zipCode: address.postcode,
            country: address.country
        };
    }
}

module.exports = new GeocodingService();