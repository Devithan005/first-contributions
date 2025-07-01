const express = require('express');
const { body, validationResult } = require('express-validator');
const geocodingService = require('../services/geocodingService');
const logger = require('../utils/logger');

const router = express.Router();

// Reverse geocoding - convert coordinates to address
router.post('/reverse', [
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coordinates',
                errors: errors.array()
            });
        }

        const { latitude, longitude } = req.body;

        const result = await geocodingService.reverseGeocode(latitude, longitude);

        if (result.success) {
            res.json({
                success: true,
                address: result.address,
                components: result.components,
                confidence: result.confidence
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message || 'Reverse geocoding failed'
            });
        }

    } catch (error) {
        logger.error('Reverse geocoding error:', error);
        res.status(500).json({
            success: false,
            message: 'Geocoding service error'
        });
    }
});

// Forward geocoding - convert address to coordinates
router.post('/forward', [
    body('address').trim().isLength({ min: 5, max: 200 }).withMessage('Address must be 5-200 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid address',
                errors: errors.array()
            });
        }

        const { address } = req.body;

        const result = await geocodingService.forwardGeocode(address);

        if (result.success) {
            res.json({
                success: true,
                coordinates: result.coordinates,
                formattedAddress: result.formattedAddress,
                confidence: result.confidence
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message || 'Address geocoding failed'
            });
        }

    } catch (error) {
        logger.error('Forward geocoding error:', error);
        res.status(500).json({
            success: false,
            message: 'Geocoding service error'
        });
    }
});

// Get nearby places (hospitals, pharmacies, etc.)
router.post('/nearby', [
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('type').optional().isIn(['hospital', 'pharmacy', 'clinic', 'emergency']).withMessage('Invalid place type'),
    body('radius').optional().isInt({ min: 100, max: 50000 }).withMessage('Radius must be between 100 and 50000 meters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid parameters',
                errors: errors.array()
            });
        }

        const { latitude, longitude, type = 'hospital', radius = 10000 } = req.body;

        const result = await geocodingService.findNearbyPlaces(latitude, longitude, type, radius);

        if (result.success) {
            res.json({
                success: true,
                places: result.places,
                total: result.total
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message || 'Nearby places search failed'
            });
        }

    } catch (error) {
        logger.error('Nearby places search error:', error);
        res.status(500).json({
            success: false,
            message: 'Places search service error'
        });
    }
});

module.exports = router;