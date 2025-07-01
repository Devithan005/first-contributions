const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const emergencySchema = new mongoose.Schema({
    emergencyId: {
        type: String,
        unique: true,
        default: () => `EMG-${uuidv4().substring(0, 8).toUpperCase()}`
    },
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    patient: {
        name: { type: String, required: true, trim: true },
        phoneNumber: { type: String, required: true },
        age: Number,
        gender: { type: String, enum: ['Male', 'Female', 'Other', 'Not Specified'] },
        medicalHistory: [String],
        allergies: [String],
        medications: [String],
        emergencyContact: {
            name: String,
            phone: String,
            relationship: String
        }
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        },
        address: String,
        accuracy: Number,
        timestamp: { type: Date, default: Date.now }
    },
    emergency: {
        type: {
            type: String,
            required: true,
            enum: [
                'cardiac',
                'trauma',
                'stroke',
                'respiratory',
                'neurological',
                'poisoning',
                'burns',
                'childbirth',
                'other'
            ]
        },
        description: { type: String, required: true, maxlength: 1000 },
        severity: {
            type: String,
            required: true,
            enum: ['critical', 'urgent', 'moderate']
        },
        symptoms: [String],
        timeOfOnset: Date,
        consciousness: {
            type: String,
            enum: ['Alert', 'Drowsy', 'Unresponsive', 'Unknown']
        },
        breathing: {
            type: String,
            enum: ['Normal', 'Labored', 'Absent', 'Unknown']
        },
        vitals: {
            heartRate: Number,
            bloodPressure: {
                systolic: Number,
                diastolic: Number
            },
            temperature: Number,
            oxygenSaturation: Number,
            timestamp: Date
        }
    },
    response: {
        status: {
            type: String,
            enum: [
                'submitted',
                'processing',
                'ambulance_dispatched',
                'en_route',
                'arrived_at_scene',
                'transported',
                'arrived_at_hospital',
                'completed',
                'cancelled'
            ],
            default: 'submitted'
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Critical'],
            default: 'Medium'
        },
        dispatchTime: Date,
        arrivalTime: Date,
        transportTime: Date,
        hospitalArrivalTime: Date,
        completionTime: Date,
        estimatedArrivalTime: Date,
        responseTeam: {
            ambulanceUnit: String,
            paramedics: [String],
            dispatcher: String
        }
    },
    assignedHospital: {
        hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
        name: String,
        address: String,
        phone: String,
        distance: Number, // in meters
        eta: Number, // in minutes
        confirmedAt: Date,
        reasonForSelection: String,
        backupHospitals: [{
            hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
            name: String,
            distance: Number,
            reason: String
        }]
    },
    ambulance: {
        ambulanceId: String,
        unit: String,
        crew: [{
            name: String,
            role: String,
            certification: String
        }],
        equipment: [String],
        gpsLocation: {
            type: {
                type: String,
                enum: ['Point']
            },
            coordinates: [Number]
        },
        status: {
            type: String,
            enum: ['dispatched', 'en_route_to_scene', 'at_scene', 'en_route_to_hospital', 'at_hospital', 'available'],
            default: 'dispatched'
        },
        lastUpdate: { type: Date, default: Date.now }
    },
    timeline: [{
        timestamp: { type: Date, default: Date.now },
        event: String,
        details: String,
        updatedBy: String,
        location: {
            type: {
                type: String,
                enum: ['Point']
            },
            coordinates: [Number]
        }
    }],
    communications: [{
        timestamp: { type: Date, default: Date.now },
        type: { type: String, enum: ['sms', 'call', 'push', 'email'] },
        to: String,
        from: String,
        message: String,
        status: { type: String, enum: ['sent', 'delivered', 'failed'], default: 'sent' }
    }],
    metadata: {
        userAgent: String,
        ipAddress: String,
        deviceInfo: {
            type: String,
            platform: String,
            browser: String
        },
        referrer: String,
        source: { type: String, default: 'web' }
    },
    quality: {
        responseTime: Number, // Total response time in minutes
        patientSatisfaction: { type: Number, min: 1, max: 5 },
        hospitalRating: { type: Number, min: 1, max: 5 },
        feedback: String,
        followUpRequired: { type: Boolean, default: false },
        followUpDate: Date
    },
    billing: {
        ambulanceCharges: Number,
        hospitalCharges: Number,
        insurance: {
            provider: String,
            policyNumber: String,
            authorized: Boolean
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'authorized', 'paid', 'disputed'],
            default: 'pending'
        }
    },
    notes: [{
        timestamp: { type: Date, default: Date.now },
        author: String,
        role: String,
        content: String,
        type: { type: String, enum: ['medical', 'administrative', 'system'] }
    }],
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Indexes
emergencySchema.index({ emergencyId: 1 });
emergencySchema.index({ sessionId: 1 });
emergencySchema.index({ 'patient.phoneNumber': 1 });
emergencySchema.index({ location: '2dsphere' });
emergencySchema.index({ 'response.status': 1 });
emergencySchema.index({ 'emergency.severity': 1 });
emergencySchema.index({ createdAt: -1 });

// Virtual for response time calculation
emergencySchema.virtual('responseTimeMinutes').get(function() {
    if (this.response.arrivalTime && this.createdAt) {
        return Math.round((this.response.arrivalTime - this.createdAt) / (1000 * 60));
    }
    return null;
});

// Method to add timeline event
emergencySchema.methods.addTimelineEvent = function(event, details, updatedBy, location = null) {
    this.timeline.push({
        timestamp: new Date(),
        event,
        details,
        updatedBy,
        location
    });
    return this.save();
};

// Method to update status
emergencySchema.methods.updateStatus = function(newStatus, updatedBy, details = '') {
    this.response.status = newStatus;
    this.addTimelineEvent(`Status changed to ${newStatus}`, details, updatedBy);
    
    // Update specific timestamps based on status
    switch(newStatus) {
        case 'ambulance_dispatched':
            this.response.dispatchTime = new Date();
            break;
        case 'arrived_at_scene':
            this.response.arrivalTime = new Date();
            break;
        case 'transported':
            this.response.transportTime = new Date();
            break;
        case 'arrived_at_hospital':
            this.response.hospitalArrivalTime = new Date();
            break;
        case 'completed':
            this.response.completionTime = new Date();
            break;
    }
    
    return this.save();
};

// Method to assign hospital
emergencySchema.methods.assignHospital = function(hospital, distance, eta, reason) {
    this.assignedHospital = {
        hospitalId: hospital._id,
        name: hospital.name,
        address: hospital.fullAddress,
        phone: hospital.contact.emergencyPhone,
        distance,
        eta,
        confirmedAt: new Date(),
        reasonForSelection: reason
    };
    
    this.addTimelineEvent(
        'Hospital assigned',
        `Assigned to ${hospital.name} - Distance: ${(distance/1000).toFixed(1)}km, ETA: ${eta} minutes`,
        'system'
    );
    
    return this.save();
};

// Method to update ambulance location
emergencySchema.methods.updateAmbulanceLocation = function(longitude, latitude, status) {
    this.ambulance.gpsLocation = {
        type: 'Point',
        coordinates: [longitude, latitude]
    };
    this.ambulance.status = status;
    this.ambulance.lastUpdate = new Date();
    
    return this.save();
};

// Method to add communication log
emergencySchema.methods.logCommunication = function(type, to, from, message, status = 'sent') {
    this.communications.push({
        timestamp: new Date(),
        type,
        to,
        from,
        message,
        status
    });
    return this.save();
};

// Static method to get emergency statistics
emergencySchema.statics.getStatistics = async function(startDate, endDate) {
    const stats = await this.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: null,
                totalEmergencies: { $sum: 1 },
                completedEmergencies: {
                    $sum: { $cond: [{ $eq: ['$response.status', 'completed'] }, 1, 0] }
                },
                avgResponseTime: { $avg: '$quality.responseTime' },
                criticalEmergencies: {
                    $sum: { $cond: [{ $eq: ['$emergency.severity', 'critical'] }, 1, 0] }
                },
                emergencyTypes: { $push: '$emergency.type' }
            }
        }
    ]);
    
    return stats[0] || {};
};

// Pre-save middleware
emergencySchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // Auto-calculate priority based on severity and type
    if (this.isModified('emergency.severity') || this.isModified('emergency.type')) {
        switch(this.emergency.severity) {
            case 'critical':
                this.response.priority = 'Critical';
                break;
            case 'urgent':
                this.response.priority = 'High';
                break;
            case 'moderate':
                this.response.priority = 'Medium';
                break;
            default:
                this.response.priority = 'Low';
        }
    }
    
    next();
});

module.exports = mongoose.model('Emergency', emergencySchema);