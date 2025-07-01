const logger = require('../utils/logger');

class ErrorHandler {
    /**
     * Main error handling middleware
     */
    static handle(err, req, res, next) {
        let error = { ...err };
        error.message = err.message;

        // Log error
        logger.error(`Error ${err.message}`, {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            stack: err.stack
        });

        // Mongoose bad ObjectId
        if (err.name === 'CastError') {
            const message = 'Resource not found';
            error = new ErrorResponse(message, 404);
        }

        // Mongoose duplicate key
        if (err.code === 11000) {
            const message = 'Duplicate field value entered';
            error = new ErrorResponse(message, 400);
        }

        // Mongoose validation error
        if (err.name === 'ValidationError') {
            const message = Object.values(err.errors).map(val => val.message);
            error = new ErrorResponse(message, 400);
        }

        // JWT errors
        if (err.name === 'JsonWebTokenError') {
            const message = 'Invalid token';
            error = new ErrorResponse(message, 401);
        }

        if (err.name === 'TokenExpiredError') {
            const message = 'Token expired';
            error = new ErrorResponse(message, 401);
        }

        // Rate limit errors
        if (err.status === 429) {
            const message = 'Too many requests, please try again later';
            error = new ErrorResponse(message, 429);
        }

        // Emergency-specific errors
        if (err.name === 'EmergencySubmissionError') {
            const message = 'Emergency submission failed - please call 911 immediately';
            error = new ErrorResponse(message, 500);
        }

        if (err.name === 'HospitalNotFoundError') {
            const message = 'No suitable hospitals found nearby';
            error = new ErrorResponse(message, 404);
        }

        if (err.name === 'AmbulanceUnavailableError') {
            const message = 'No ambulances currently available';
            error = new ErrorResponse(message, 503);
        }

        // Default to 500 server error
        const statusCode = error.statusCode || 500;
        const message = error.message || 'Server Error';

        const response = {
            success: false,
            error: message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        };

        // Add emergency contact info for critical errors
        if (statusCode >= 500) {
            response.emergencyContact = '911';
            response.supportContact = '+1-555-SUPPORT';
        }

        res.status(statusCode).json(response);
    }

    /**
     * Handle 404 errors
     */
    static notFound(req, res, next) {
        const message = `Route ${req.originalUrl} not found`;
        logger.warn('404 Not Found', {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip
        });
        
        res.status(404).json({
            success: false,
            error: message
        });
    }

    /**
     * Async error wrapper
     */
    static asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * Validation error handler
     */
    static validationError(errors) {
        const message = errors.map(error => error.msg).join(', ');
        return new ErrorResponse(message, 400);
    }

    /**
     * Emergency error handler (for critical system failures)
     */
    static emergencyError(err, req, res) {
        logger.error('CRITICAL SYSTEM ERROR', {
            error: err.message,
            stack: err.stack,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });

        // In a real system, this would trigger alerts to system administrators
        
        res.status(500).json({
            success: false,
            error: 'Critical system error - please call 911 for immediate assistance',
            emergencyContact: '911',
            supportContact: '+1-555-EMERGENCY-SUPPORT',
            errorId: `ERR-${Date.now()}`,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Database connection error handler
     */
    static databaseError(err, req, res) {
        logger.error('Database connection error', {
            error: err.message,
            stack: err.stack
        });

        res.status(503).json({
            success: false,
            error: 'Service temporarily unavailable - please try again or call 911 for emergencies',
            emergencyContact: '911',
            retryAfter: 30 // seconds
        });
    }

    /**
     * Rate limit error handler
     */
    static rateLimitError(req, res) {
        logger.security('Rate limit exceeded', {
            ip: req.ip,
            method: req.method,
            url: req.originalUrl,
            userAgent: req.get('User-Agent')
        });

        res.status(429).json({
            success: false,
            error: 'Too many requests - please wait before trying again',
            retryAfter: 60,
            emergencyContact: '911'
        });
    }

    /**
     * Permission error handler
     */
    static permissionError(req, res) {
        logger.security('Unauthorized access attempt', {
            ip: req.ip,
            method: req.method,
            url: req.originalUrl,
            userAgent: req.get('User-Agent')
        });

        res.status(403).json({
            success: false,
            error: 'Access denied'
        });
    }
}

/**
 * Custom Error Response class
 */
class ErrorResponse extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'ErrorResponse';

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = ErrorHandler.handle;