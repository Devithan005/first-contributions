const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.logFile = process.env.LOG_FILE || 'logs/app.log';
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        
        // Ensure log directory exists
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    shouldLog(level) {
        return this.levels[level] <= this.levels[this.logLevel];
    }

    formatMessage(level, message, metadata = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...metadata
        };

        return JSON.stringify(logEntry);
    }

    writeToFile(logEntry) {
        if (process.env.NODE_ENV !== 'test') {
            fs.appendFileSync(this.logFile, logEntry + '\n');
        }
    }

    log(level, message, metadata = {}) {
        if (!this.shouldLog(level)) return;

        const logEntry = this.formatMessage(level, message, metadata);
        
        // Console output with colors
        this.logToConsole(level, message, metadata);
        
        // File output
        this.writeToFile(logEntry);
    }

    logToConsole(level, message, metadata = {}) {
        const timestamp = new Date().toISOString();
        const colors = {
            error: '\x1b[31m', // Red
            warn: '\x1b[33m',  // Yellow
            info: '\x1b[36m',  // Cyan
            debug: '\x1b[37m'  // White
        };
        
        const reset = '\x1b[0m';
        const color = colors[level] || colors.info;
        
        let output = `${color}[${timestamp}] ${level.toUpperCase()}: ${message}${reset}`;
        
        if (Object.keys(metadata).length > 0) {
            output += `\n${JSON.stringify(metadata, null, 2)}`;
        }
        
        console.log(output);
    }

    error(message, metadata = {}) {
        if (metadata instanceof Error) {
            metadata = {
                error: metadata.message,
                stack: metadata.stack,
                name: metadata.name
            };
        }
        this.log('error', message, metadata);
    }

    warn(message, metadata = {}) {
        this.log('warn', message, metadata);
    }

    info(message, metadata = {}) {
        this.log('info', message, metadata);
    }

    debug(message, metadata = {}) {
        this.log('debug', message, metadata);
    }

    // Emergency-specific logging methods
    emergency(emergencyId, message, metadata = {}) {
        this.info(`[EMERGENCY:${emergencyId}] ${message}`, {
            emergencyId,
            category: 'emergency',
            ...metadata
        });
    }

    hospital(hospitalId, message, metadata = {}) {
        this.info(`[HOSPITAL:${hospitalId}] ${message}`, {
            hospitalId,
            category: 'hospital',
            ...metadata
        });
    }

    ambulance(ambulanceId, message, metadata = {}) {
        this.info(`[AMBULANCE:${ambulanceId}] ${message}`, {
            ambulanceId,
            category: 'ambulance',
            ...metadata
        });
    }

    api(method, url, statusCode, responseTime, metadata = {}) {
        this.info(`${method} ${url} ${statusCode} - ${responseTime}ms`, {
            category: 'api',
            method,
            url,
            statusCode,
            responseTime,
            ...metadata
        });
    }

    security(event, metadata = {}) {
        this.warn(`[SECURITY] ${event}`, {
            category: 'security',
            event,
            ...metadata
        });
    }

    performance(operation, duration, metadata = {}) {
        this.debug(`[PERFORMANCE] ${operation} took ${duration}ms`, {
            category: 'performance',
            operation,
            duration,
            ...metadata
        });
    }
}

module.exports = new Logger();