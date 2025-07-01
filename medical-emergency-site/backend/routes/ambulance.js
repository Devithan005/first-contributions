const express = require('express');
const ambulanceService = require('../services/ambulanceService');
const logger = require('../utils/logger');

const router = express.Router();

// Get all ambulance statuses
router.get('/status', async (req, res) => {
    try {
        const statuses = ambulanceService.getAllAmbulanceStatuses();
        
        res.json({
            success: true,
            ambulances: statuses
        });

    } catch (error) {
        logger.error('Error fetching ambulance statuses:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ambulance statuses'
        });
    }
});

// Get specific ambulance status
router.get('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const status = ambulanceService.getAmbulanceStatus(id);
        
        if (!status) {
            return res.status(404).json({
                success: false,
                message: 'Ambulance not found'
            });
        }

        res.json({
            success: true,
            ambulance: status
        });

    } catch (error) {
        logger.error('Error fetching ambulance status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ambulance status'
        });
    }
});

// Update ambulance status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, location } = req.body;
        
        ambulanceService.updateAmbulanceStatus(id, status, location);
        
        res.json({
            success: true,
            message: 'Ambulance status updated successfully'
        });

    } catch (error) {
        logger.error('Error updating ambulance status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update ambulance status'
        });
    }
});

module.exports = router;