const express = require('express');
const { body, validationResult } = require('express-validator');
const Hospital = require('../models/Hospital');
const hospitalService = require('../services/hospitalService');
const logger = require('../utils/logger');

const router = express.Router();

// Get all hospitals
router.get('/', async (req, res) => {
    try {
        const { latitude, longitude, specialty, maxDistance = 50000 } = req.query;
        
        let hospitals;
        
        if (specialty) {
            hospitals = await hospitalService.getHospitalsBySpecialty(
                specialty, 
                latitude ? parseFloat(latitude) : null, 
                longitude ? parseFloat(longitude) : null, 
                parseInt(maxDistance)
            );
        } else if (latitude && longitude) {
            const results = await hospitalService.findNearbyHospitals(
                parseFloat(longitude), 
                parseFloat(latitude), 
                'other', 
                'moderate', 
                parseInt(maxDistance)
            );
            hospitals = results.map(r => r.hospital);
        } else {
            hospitals = await Hospital.find({ status: 'Active' }).limit(50);
        }

        res.json({
            success: true,
            count: hospitals.length,
            hospitals
        });

    } catch (error) {
        logger.error('Error fetching hospitals:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch hospitals'
        });
    }
});

// Get hospital by ID
router.get('/:id', async (req, res) => {
    try {
        const hospital = await hospitalService.getHospitalById(req.params.id);
        
        res.json({
            success: true,
            hospital
        });

    } catch (error) {
        logger.error('Error fetching hospital:', error);
        res.status(404).json({
            success: false,
            message: 'Hospital not found'
        });
    }
});

// Search hospitals
router.get('/search/:term', async (req, res) => {
    try {
        const { term } = req.params;
        const { latitude, longitude } = req.query;
        
        const hospitals = await hospitalService.searchHospitals(
            term,
            latitude ? parseFloat(latitude) : null,
            longitude ? parseFloat(longitude) : null
        );

        res.json({
            success: true,
            count: hospitals.length,
            hospitals
        });

    } catch (error) {
        logger.error('Error searching hospitals:', error);
        res.status(500).json({
            success: false,
            message: 'Hospital search failed'
        });
    }
});

// Check hospital availability
router.get('/:id/availability', async (req, res) => {
    try {
        const { id } = req.params;
        const { emergencyType = 'other' } = req.query;
        
        const availability = await hospitalService.checkAvailability(id, emergencyType);
        
        res.json({
            success: true,
            availability
        });

    } catch (error) {
        logger.error('Error checking hospital availability:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check availability'
        });
    }
});

// Update hospital capacity (for hospital staff)
router.patch('/:id/capacity', [
    body('availableBeds').optional().isInt({ min: 0 }),
    body('availableIcuBeds').optional().isInt({ min: 0 }),
    body('availableEmergencyRooms').optional().isInt({ min: 0 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const capacityData = req.body;
        
        const hospital = await hospitalService.updateHospitalCapacity(id, capacityData);
        
        res.json({
            success: true,
            message: 'Hospital capacity updated successfully',
            capacity: hospital.capacity
        });

    } catch (error) {
        logger.error('Error updating hospital capacity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update capacity'
        });
    }
});

// Get hospital statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const statistics = await hospitalService.getHospitalStatistics();
        
        res.json({
            success: true,
            statistics
        });

    } catch (error) {
        logger.error('Error fetching hospital statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

module.exports = router;