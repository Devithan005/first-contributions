const express = require('express');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const router = express.Router();

// Send test notification
router.post('/test', async (req, res) => {
    try {
        const { type, to, message, subject, title } = req.body;
        
        let result;
        
        switch(type) {
            case 'sms':
                result = await notificationService.sendSMS(to, message);
                break;
            case 'email':
                result = await notificationService.sendEmail(to, subject, message);
                break;
            case 'push':
                result = await notificationService.sendPushNotification(to, title, message);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid notification type'
                });
        }

        res.json({
            success: result.success,
            message: 'Test notification sent',
            result
        });

    } catch (error) {
        logger.error('Error sending test notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test notification'
        });
    }
});

module.exports = router;