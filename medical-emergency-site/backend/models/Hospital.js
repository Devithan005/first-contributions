const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, default: 'USA' }
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
            validate: {
                validator: function(v) {
                    return v.length === 2 && 
                           v[0] >= -180 && v[0] <= 180 && 
                           v[1] >= -90 && v[1] <= 90;
                },
                message: 'Invalid coordinates format'
            }
        }
    },
    contact: {
        phone: { type: String, required: true },
        emergencyPhone: { type: String, required: true },
        fax: String,
        email: String,
        website: String
    },
    operatingHours: {
        emergency: {
            type: String,
            default: '24/7'
        },
        general: {
            monday: { open: String, close: String },
            tuesday: { open: String, close: String },
            wednesday: { open: String, close: String },
            thursday: { open: String, close: String },
            friday: { open: String, close: String },
            saturday: { open: String, close: String },
            sunday: { open: String, close: String }
        }
    },
    capacity: {
        totalBeds: { type: Number, required: true, min: 0 },
        availableBeds: { type: Number, required: true, min: 0 },
        icuBeds: { type: Number, default: 0, min: 0 },
        availableIcuBeds: { type: Number, default: 0, min: 0 },
        emergencyRooms: { type: Number, default: 0, min: 0 },
        availableEmergencyRooms: { type: Number, default: 0, min: 0 },
        lastUpdated: { type: Date, default: Date.now }
    },
    specialties: [{
        type: String,
        enum: [
            'Cardiology',
            'Neurology',
            'Orthopedics',
            'Pediatrics',
            'Trauma Center',
            'Burn Unit',
            'Stroke Center',
            'Cancer Center',
            'Maternity',
            'Mental Health',
            'Emergency Medicine',
            'Surgery',
            'Intensive Care',
            'Dialysis',
            'Radiology',
            'Laboratory',
            'Pharmacy',
            'Physical Therapy',
            'Rehabilitation',
            'Other'
        ]
    }],
    emergencyServices: {
        traumaLevel: {
            type: String,
            enum: ['Level I', 'Level II', 'Level III', 'Level IV', 'None'],
            default: 'None'
        },
        strokeCenter: { type: Boolean, default: false },
        heartAttackCenter: { type: Boolean, default: false },
        burnCenter: { type: Boolean, default: false },
        poisonControl: { type: Boolean, default: false },
        psychiatric: { type: Boolean, default: false },
        pediatricEmergency: { type: Boolean, default: false }
    },
    equipment: {
        mriMachine: { type: Boolean, default: false },
        ctScan: { type: Boolean, default: false },
        xrayMachine: { type: Boolean, default: false },
        ultrasound: { type: Boolean, default: false },
        defibrillators: { type: Number, default: 0 },
        ventilators: { type: Number, default: 0 },
        ambulances: { type: Number, default: 0 },
        helipad: { type: Boolean, default: false },
        bloodBank: { type: Boolean, default: false },
        pharmacy: { type: Boolean, default: false },
        laboratory: { type: Boolean, default: false }
    },
    staff: {
        doctors: { type: Number, default: 0 },
        nurses: { type: Number, default: 0 },
        specialists: { type: Number, default: 0 },
        onCallStaff: { type: Number, default: 0 }
    },
    rating: {
        overall: { type: Number, min: 1, max: 5, default: 3 },
        emergency: { type: Number, min: 1, max: 5, default: 3 },
        reviews: { type: Number, default: 0 }
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Maintenance', 'Emergency Only'],
        default: 'Active'
    },
    emergencyContacts: [{
        name: String,
        role: String,
        phone: String,
        email: String
    }],
    insuranceAccepted: [String],
    languages: [String],
    accessibility: {
        wheelchairAccessible: { type: Boolean, default: true },
        hearingImpaired: { type: Boolean, default: false },
        visuallyImpaired: { type: Boolean, default: false }
    },
    certifications: [{
        name: String,
        issuedBy: String,
        issuedDate: Date,
        expiryDate: Date,
        status: { type: String, enum: ['Active', 'Expired', 'Pending'], default: 'Active' }
    }],
    lastCapacityUpdate: { type: Date, default: Date.now },
    averageWaitTime: { type: Number, default: 30 }, // in minutes
    
    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Indexes for geospatial queries
hospitalSchema.index({ location: '2dsphere' });
hospitalSchema.index({ 'address.city': 1, 'address.state': 1 });
hospitalSchema.index({ specialties: 1 });
hospitalSchema.index({ status: 1 });
hospitalSchema.index({ 'emergencyServices.traumaLevel': 1 });

// Virtual for full address
hospitalSchema.virtual('fullAddress').get(function() {
    return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}`;
});

// Method to check if hospital can handle specific emergency
hospitalSchema.methods.canHandleEmergency = function(emergencyType) {
    const emergencyMappings = {
        'cardiac': this.emergencyServices.heartAttackCenter,
        'stroke': this.emergencyServices.strokeCenter,
        'trauma': this.emergencyServices.traumaLevel !== 'None',
        'burns': this.emergencyServices.burnCenter,
        'poisoning': this.emergencyServices.poisonControl,
        'neurological': this.specialties.includes('Neurology'),
        'respiratory': this.equipment.ventilators > 0,
        'childbirth': this.specialties.includes('Maternity'),
        'other': true
    };
    
    return emergencyMappings[emergencyType] || false;
};

// Method to calculate match score for emergency
hospitalSchema.methods.calculateEmergencyScore = function(emergencyType, severity) {
    let score = 0;
    
    // Base score for availability
    if (this.capacity.availableBeds > 0) score += 30;
    if (this.capacity.availableEmergencyRooms > 0) score += 20;
    
    // Emergency type matching
    if (this.canHandleEmergency(emergencyType)) score += 25;
    
    // Severity matching
    if (severity === 'critical') {
        if (this.emergencyServices.traumaLevel === 'Level I') score += 15;
        else if (this.emergencyServices.traumaLevel === 'Level II') score += 10;
        if (this.capacity.availableIcuBeds > 0) score += 10;
    }
    
    // Equipment availability
    if (this.equipment.ctScan) score += 5;
    if (this.equipment.mriMachine) score += 5;
    if (this.equipment.ventilators > 0) score += 5;
    
    return Math.min(score, 100); // Cap at 100
};

// Method to update capacity
hospitalSchema.methods.updateCapacity = async function(capacityData) {
    Object.assign(this.capacity, capacityData);
    this.capacity.lastUpdated = new Date();
    this.lastCapacityUpdate = new Date();
    return this.save();
};

// Static method to find nearby hospitals
hospitalSchema.statics.findNearby = function(longitude, latitude, maxDistance = 50000, emergencyType = null) {
    const query = {
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
    };
    
    if (emergencyType) {
        // Add emergency-specific filters based on type
        switch(emergencyType) {
            case 'cardiac':
                query['emergencyServices.heartAttackCenter'] = true;
                break;
            case 'stroke':
                query['emergencyServices.strokeCenter'] = true;
                break;
            case 'trauma':
                query['emergencyServices.traumaLevel'] = { $ne: 'None' };
                break;
            case 'burns':
                query['emergencyServices.burnCenter'] = true;
                break;
        }
    }
    
    return this.find(query);
};

// Pre-save middleware
hospitalSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // Validate capacity constraints
    if (this.capacity.availableBeds > this.capacity.totalBeds) {
        this.capacity.availableBeds = this.capacity.totalBeds;
    }
    if (this.capacity.availableIcuBeds > this.capacity.icuBeds) {
        this.capacity.availableIcuBeds = this.capacity.icuBeds;
    }
    if (this.capacity.availableEmergencyRooms > this.capacity.emergencyRooms) {
        this.capacity.availableEmergencyRooms = this.capacity.emergencyRooms;
    }
    
    next();
});

module.exports = mongoose.model('Hospital', hospitalSchema);