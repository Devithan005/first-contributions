const express = require('express');
const { body, validationResult } = require('express-validator');
const Emergency = require('../models/Emergency');
const Hospital = require('../models/Hospital');
const logger = require('../utils/logger');
const geocodingService = require('../services/geocodingService');
const hospitalService = require('../services/hospitalService');
const ambulanceService = require('../services/ambulanceService');
const notificationService = require('../services/notificationService');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Phone verification endpoint
router.post('/verify-phone', [
    body('phoneNumber')
        .isMobilePhone()
        .withMessage('Please provide a valid phone number')
        .normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format',
                errors: errors.array()
            });
        }

        const { phoneNumber } = req.body;
        
        // Generate session ID
        const sessionId = uuidv4();
        
        // Log the phone verification attempt
        logger.info(`Phone verification attempt for: ${phoneNumber.replace(/\d(?=\d{4})/g, '*')}`);
        
        // In a real implementation, you might:
        // 1. Send SMS verification code
        // 2. Check against emergency services database
        // 3. Validate phone number with carrier
        
        // For demo purposes, we'll accept all valid phone numbers
        res.json({
            success: true,
            sessionId,
            message: 'Phone number verified successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Phone verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Phone verification failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Emergency submission endpoint
router.post('/submit', [
    body('sessionId').isUUID().withMessage('Invalid session ID'),
    body('phoneNumber').isMobilePhone().withMessage('Invalid phone number'),
    body('patientName').trim().isLength({ min: 2, max: 100 }).withMessage('Patient name must be 2-100 characters'),
    body('location.latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('location.longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('emergencyType').isIn(['cardiac', 'trauma', 'stroke', 'respiratory', 'neurological', 'poisoning', 'burns', 'childbirth', 'other']).withMessage('Invalid emergency type'),
    body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters'),
    body('severity').isIn(['critical', 'urgent', 'moderate']).withMessage('Invalid severity level')
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

        const {
            sessionId,
            phoneNumber,
            patientName,
            location,
            emergencyType,
            description,
            severity
        } = req.body;

        // Create emergency record
        const emergency = new Emergency({
            sessionId,
            patient: {
                name: patientName,
                phoneNumber
            },
            location: {
                type: 'Point',
                coordinates: [location.longitude, location.latitude],
                address: location.address,
                accuracy: location.accuracy
            },
            emergency: {
                type: emergencyType,
                description,
                severity
            },
            metadata: {
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip,
                source: 'web'
            }
        });

        await emergency.save();

        logger.info(`Emergency submitted: ${emergency.emergencyId} for ${patientName}`);

        // Add initial timeline event
        await emergency.addTimelineEvent('Emergency submitted', description, 'patient');

        // Find nearby hospitals
        const nearbyHospitals = await hospitalService.findNearbyHospitals(
            location.longitude,
            location.latitude,
            emergencyType,
            severity
        );

        // Assign best hospital
        let assignedHospital = null;
        let hospitalResults = [];

        if (nearbyHospitals.length > 0) {
            const bestHospital = nearbyHospitals[0];
            const distance = bestHospital.distance;
            const eta = Math.ceil(distance / 1000 * 2); // Rough ETA calculation (2 minutes per km)

            await emergency.assignHospital(
                bestHospital.hospital,
                distance,
                eta,
                'Best match for emergency type and availability'
            );

            assignedHospital = {
                name: bestHospital.hospital.name,
                phone: bestHospital.hospital.contact.emergencyPhone
            };

            // Format hospital results for frontend
            hospitalResults = nearbyHospitals.slice(0, 5).map(result => ({
                name: result.hospital.name,
                address: result.hospital.fullAddress,
                phone: result.hospital.contact.emergencyPhone,
                distance: `${(result.distance / 1000).toFixed(1)} km`,
                eta: `${Math.ceil(result.distance / 1000 * 2)} min`,
                availableBeds: result.hospital.capacity.availableBeds,
                specialties: result.hospital.specialties.filter(s => 
                    result.hospital.canHandleEmergency(emergencyType) ? 
                    [emergencyType, 'Emergency Medicine'].includes(s) : 
                    ['Emergency Medicine'].includes(s)
                ),
                emergencyMatch: result.hospital.canHandleEmergency(emergencyType),
                score: result.score
            }));
        }

        // Request ambulance dispatch
        const ambulanceDispatch = await ambulanceService.requestAmbulance(
            emergency.emergencyId,
            location,
            severity,
            emergencyType
        );

        // Update emergency status
        await emergency.updateStatus('processing', 'system', 'Finding nearest equipped hospital and dispatching ambulance');

        // Send notifications
        await notificationService.sendEmergencyNotification(emergency, assignedHospital);

        // Emit real-time update
        const io = req.app.get('io');
        io.to(`emergency-${emergency.emergencyId}`).emit('emergency-update', {
            emergencyId: emergency.emergencyId,
            status: emergency.response.status,
            timestamp: new Date().toISOString()
        });

        // Simulate ambulance dispatch (in real system, this would integrate with dispatch system)
        setTimeout(async () => {
            try {
                await emergency.updateStatus('ambulance_dispatched', 'dispatch_system', 'Ambulance unit dispatched to location');
                io.to(`emergency-${emergency.emergencyId}`).emit('emergency-update', {
                    emergencyId: emergency.emergencyId,
                    status: 'ambulance_dispatched',
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                logger.error('Error updating ambulance dispatch status:', error);
            }
        }, 3000);

        res.json({
            success: true,
            emergencyId: emergency.emergencyId,
            message: 'Emergency submitted successfully',
            hospitals: hospitalResults,
            ambulanceContact: ambulanceDispatch.dispatchPhone || '+1-555-AMBULANCE',
            hospitalContact: assignedHospital?.phone || '+1-555-HOSPITAL',
            estimatedArrival: ambulanceDispatch.estimatedArrival || '8-12 minutes',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Emergency submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Emergency submission failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get emergency status
router.get('/status/:emergencyId', async (req, res) => {
    try {
        const { emergencyId } = req.params;

        const emergency = await Emergency.findOne({ emergencyId })
            .populate('assignedHospital.hospitalId')
            .select('-metadata -communications');

        if (!emergency) {
            return res.status(404).json({
                success: false,
                message: 'Emergency not found'
            });
        }

        res.json({
            success: true,
            emergency: {
                emergencyId: emergency.emergencyId,
                status: emergency.response.status,
                priority: emergency.response.priority,
                patient: emergency.patient.name,
                location: emergency.location.address,
                emergencyType: emergency.emergency.type,
                severity: emergency.emergency.severity,
                assignedHospital: emergency.assignedHospital,
                ambulance: emergency.ambulance,
                timeline: emergency.timeline.slice(-10), // Last 10 events
                createdAt: emergency.createdAt,
                estimatedArrival: emergency.response.estimatedArrivalTime
            }
        });

    } catch (error) {
        logger.error('Error fetching emergency status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch emergency status'
        });
    }
});

// Update emergency status (for emergency services)
router.patch('/status/:emergencyId', [
    body('status').isIn(['submitted', 'processing', 'ambulance_dispatched', 'en_route', 'arrived_at_scene', 'transported', 'arrived_at_hospital', 'completed', 'cancelled']).withMessage('Invalid status'),
    body('updatedBy').optional().isString(),
    body('details').optional().isString(),
    body('location.latitude').optional().isFloat({ min: -90, max: 90 }),
    body('location.longitude').optional().isFloat({ min: -180, max: 180 })
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

        const { emergencyId } = req.params;
        const { status, updatedBy = 'system', details = '', location } = req.body;

        const emergency = await Emergency.findOne({ emergencyId });
        if (!emergency) {
            return res.status(404).json({
                success: false,
                message: 'Emergency not found'
            });
        }

        // Update ambulance location if provided
        if (location && location.latitude && location.longitude) {
            await emergency.updateAmbulanceLocation(location.longitude, location.latitude, status);
        }

        // Update status
        await emergency.updateStatus(status, updatedBy, details);

        // Emit real-time update
        const io = req.app.get('io');
        io.to(`emergency-${emergency.emergencyId}`).emit('emergency-update', {
            emergencyId: emergency.emergencyId,
            status: emergency.response.status,
            location: location,
            timestamp: new Date().toISOString()
        });

        // Send status update notification
        await notificationService.sendStatusUpdate(emergency);

        res.json({
            success: true,
            message: 'Emergency status updated successfully',
            status: emergency.response.status,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error updating emergency status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update emergency status'
        });
    }
});

// Get emergency statistics (for admin dashboard)
router.get('/statistics', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
        const end = endDate ? new Date(endDate) : new Date();

        const statistics = await Emergency.getStatistics(start, end);

        res.json({
            success: true,
            statistics,
            period: {
                start: start.toISOString(),
                end: end.toISOString()
            }
        });

    } catch (error) {
        logger.error('Error fetching emergency statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

// Cancel emergency
router.patch('/cancel/:emergencyId', [
    body('reason').optional().isString().withMessage('Cancellation reason must be a string'),
    body('cancelledBy').optional().isString().withMessage('Cancelled by must be a string')
], async (req, res) => {
    try {
        const { emergencyId } = req.params;
        const { reason = 'User cancelled', cancelledBy = 'patient' } = req.body;

        const emergency = await Emergency.findOne({ emergencyId });
        if (!emergency) {
            return res.status(404).json({
                success: false,
                message: 'Emergency not found'
            });
        }

        // Only allow cancellation if not yet completed
        if (['completed', 'cancelled'].includes(emergency.response.status)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel completed or already cancelled emergency'
            });
        }

        await emergency.updateStatus('cancelled', cancelledBy, reason);

        // Emit real-time update
        const io = req.app.get('io');
        io.to(`emergency-${emergency.emergencyId}`).emit('emergency-update', {
            emergencyId: emergency.emergencyId,
            status: 'cancelled',
            timestamp: new Date().toISOString()
        });

        // Notify emergency services about cancellation
        await notificationService.sendCancellationNotification(emergency, reason);

        res.json({
            success: true,
            message: 'Emergency cancelled successfully',
            emergencyId: emergency.emergencyId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error cancelling emergency:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel emergency'
        });
    }
});

module.exports = router;