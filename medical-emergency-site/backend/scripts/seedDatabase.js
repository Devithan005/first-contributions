const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');
const logger = require('../utils/logger');
require('dotenv').config();

// Sample hospital data
const sampleHospitals = [
    {
        name: "Metropolitan General Hospital",
        address: {
            street: "1234 Health Avenue",
            city: "New York",
            state: "NY",
            zipCode: "10001",
            country: "USA"
        },
        location: {
            type: "Point",
            coordinates: [-73.9857, 40.7484] // Times Square area
        },
        contact: {
            phone: "+1-212-555-0101",
            emergencyPhone: "+1-212-555-0911",
            email: "emergency@metgeneral.com",
            website: "https://metgeneral.com"
        },
        capacity: {
            totalBeds: 500,
            availableBeds: 45,
            icuBeds: 50,
            availableIcuBeds: 8,
            emergencyRooms: 12,
            availableEmergencyRooms: 3
        },
        specialties: [
            "Emergency Medicine",
            "Cardiology",
            "Neurology",
            "Trauma Center",
            "Surgery",
            "Intensive Care"
        ],
        emergencyServices: {
            traumaLevel: "Level I",
            strokeCenter: true,
            heartAttackCenter: true,
            burnCenter: false,
            poisonControl: true,
            psychiatric: true,
            pediatricEmergency: true
        },
        equipment: {
            mriMachine: true,
            ctScan: true,
            xrayMachine: true,
            ultrasound: true,
            defibrillators: 25,
            ventilators: 40,
            ambulances: 8,
            helipad: true,
            bloodBank: true,
            pharmacy: true,
            laboratory: true
        },
        staff: {
            doctors: 150,
            nurses: 400,
            specialists: 75,
            onCallStaff: 50
        },
        rating: {
            overall: 4.5,
            emergency: 4.8,
            reviews: 1250
        },
        averageWaitTime: 25
    },
    {
        name: "St. Mary's Medical Center",
        address: {
            street: "5678 Healing Boulevard",
            city: "New York",
            state: "NY",
            zipCode: "10002",
            country: "USA"
        },
        location: {
            type: "Point",
            coordinates: [-73.9442, 40.8176] // Upper Manhattan
        },
        contact: {
            phone: "+1-212-555-0202",
            emergencyPhone: "+1-212-555-0922",
            email: "emergency@stmarysmc.com",
            website: "https://stmarysmc.com"
        },
        capacity: {
            totalBeds: 300,
            availableBeds: 25,
            icuBeds: 30,
            availableIcuBeds: 5,
            emergencyRooms: 8,
            availableEmergencyRooms: 2
        },
        specialties: [
            "Emergency Medicine",
            "Maternity",
            "Pediatrics",
            "Cardiology",
            "Surgery",
            "Mental Health"
        ],
        emergencyServices: {
            traumaLevel: "Level II",
            strokeCenter: true,
            heartAttackCenter: true,
            burnCenter: false,
            poisonControl: false,
            psychiatric: true,
            pediatricEmergency: true
        },
        equipment: {
            mriMachine: true,
            ctScan: true,
            xrayMachine: true,
            ultrasound: true,
            defibrillators: 15,
            ventilators: 20,
            ambulances: 4,
            helipad: false,
            bloodBank: true,
            pharmacy: true,
            laboratory: true
        },
        staff: {
            doctors: 90,
            nurses: 250,
            specialists: 45,
            onCallStaff: 30
        },
        rating: {
            overall: 4.2,
            emergency: 4.5,
            reviews: 850
        },
        averageWaitTime: 35
    },
    {
        name: "Brooklyn Emergency Hospital",
        address: {
            street: "9012 Emergency Drive",
            city: "Brooklyn",
            state: "NY",
            zipCode: "11201",
            country: "USA"
        },
        location: {
            type: "Point",
            coordinates: [-73.9903, 40.6892] // Brooklyn Heights
        },
        contact: {
            phone: "+1-718-555-0303",
            emergencyPhone: "+1-718-555-0933",
            email: "emergency@brooklynemergency.com",
            website: "https://brooklynemergency.com"
        },
        capacity: {
            totalBeds: 200,
            availableBeds: 18,
            icuBeds: 20,
            availableIcuBeds: 3,
            emergencyRooms: 10,
            availableEmergencyRooms: 4
        },
        specialties: [
            "Emergency Medicine",
            "Trauma Center",
            "Burns Unit",
            "Surgery",
            "Orthopedics"
        ],
        emergencyServices: {
            traumaLevel: "Level II",
            strokeCenter: false,
            heartAttackCenter: false,
            burnCenter: true,
            poisonControl: true,
            psychiatric: false,
            pediatricEmergency: false
        },
        equipment: {
            mriMachine: false,
            ctScan: true,
            xrayMachine: true,
            ultrasound: true,
            defibrillators: 12,
            ventilators: 15,
            ambulances: 6,
            helipad: false,
            bloodBank: true,
            pharmacy: true,
            laboratory: true
        },
        staff: {
            doctors: 60,
            nurses: 150,
            specialists: 25,
            onCallStaff: 20
        },
        rating: {
            overall: 4.0,
            emergency: 4.3,
            reviews: 425
        },
        averageWaitTime: 40
    },
    {
        name: "Queens Community Hospital",
        address: {
            street: "3456 Community Street",
            city: "Queens",
            state: "NY",
            zipCode: "11101",
            country: "USA"
        },
        location: {
            type: "Point",
            coordinates: [-73.9442, 40.7589] // Long Island City
        },
        contact: {
            phone: "+1-718-555-0404",
            emergencyPhone: "+1-718-555-0944",
            email: "emergency@queenscommunity.com",
            website: "https://queenscommunity.com"
        },
        capacity: {
            totalBeds: 150,
            availableBeds: 12,
            icuBeds: 15,
            availableIcuBeds: 2,
            emergencyRooms: 6,
            availableEmergencyRooms: 1
        },
        specialties: [
            "Emergency Medicine",
            "Family Medicine",
            "Pediatrics",
            "Radiology",
            "Laboratory"
        ],
        emergencyServices: {
            traumaLevel: "Level III",
            strokeCenter: false,
            heartAttackCenter: false,
            burnCenter: false,
            poisonControl: false,
            psychiatric: false,
            pediatricEmergency: true
        },
        equipment: {
            mriMachine: false,
            ctScan: true,
            xrayMachine: true,
            ultrasound: true,
            defibrillators: 8,
            ventilators: 10,
            ambulances: 2,
            helipad: false,
            bloodBank: false,
            pharmacy: true,
            laboratory: true
        },
        staff: {
            doctors: 40,
            nurses: 100,
            specialists: 15,
            onCallStaff: 12
        },
        rating: {
            overall: 3.8,
            emergency: 4.0,
            reviews: 320
        },
        averageWaitTime: 45
    },
    {
        name: "Central Park Medical Clinic",
        address: {
            street: "7890 Park Avenue",
            city: "New York",
            state: "NY",
            zipCode: "10021",
            country: "USA"
        },
        location: {
            type: "Point",
            coordinates: [-73.9654, 40.7829] // Upper East Side
        },
        contact: {
            phone: "+1-212-555-0505",
            emergencyPhone: "+1-212-555-0955",
            email: "emergency@cpmedical.com",
            website: "https://cpmedical.com"
        },
        capacity: {
            totalBeds: 100,
            availableBeds: 8,
            icuBeds: 10,
            availableIcuBeds: 1,
            emergencyRooms: 4,
            availableEmergencyRooms: 1
        },
        specialties: [
            "Emergency Medicine",
            "Urgent Care",
            "Family Medicine",
            "Internal Medicine"
        ],
        emergencyServices: {
            traumaLevel: "None",
            strokeCenter: false,
            heartAttackCenter: false,
            burnCenter: false,
            poisonControl: false,
            psychiatric: false,
            pediatricEmergency: false
        },
        equipment: {
            mriMachine: false,
            ctScan: false,
            xrayMachine: true,
            ultrasound: true,
            defibrillators: 4,
            ventilators: 5,
            ambulances: 1,
            helipad: false,
            bloodBank: false,
            pharmacy: true,
            laboratory: true
        },
        staff: {
            doctors: 25,
            nurses: 60,
            specialists: 8,
            onCallStaff: 6
        },
        rating: {
            overall: 3.5,
            emergency: 3.8,
            reviews: 180
        },
        averageWaitTime: 30
    }
];

async function seedDatabase() {
    try {
        // Connect to MongoDB
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medical_emergency_db';
        await mongoose.connect(mongoURI);
        
        logger.info('Connected to MongoDB for seeding');

        // Clear existing hospitals
        await Hospital.deleteMany({});
        logger.info('Cleared existing hospital data');

        // Insert sample hospitals
        const insertedHospitals = await Hospital.insertMany(sampleHospitals);
        logger.info(`Inserted ${insertedHospitals.length} sample hospitals`);

        // Log hospital locations for verification
        insertedHospitals.forEach(hospital => {
            logger.info(`Hospital: ${hospital.name} at [${hospital.location.coordinates[1]}, ${hospital.location.coordinates[0]}]`);
        });

        // Create additional sample data with random variations
        const additionalHospitals = [];
        const baseLocations = [
            { name: "Bronx General", coords: [-73.8648, 40.8448] },
            { name: "Staten Island Medical", coords: [-74.1502, 40.5795] },
            { name: "Manhattan North", coords: [-73.9442, 40.8176] },
            { name: "Brooklyn South", coords: [-73.9442, 40.6501] },
            { name: "Queens East", coords: [-73.7004, 40.7282] }
        ];

        baseLocations.forEach((loc, index) => {
            const hospital = {
                name: `${loc.name} Hospital`,
                address: {
                    street: `${1000 + index * 100} Medical Drive`,
                    city: loc.name.split(' ')[0],
                    state: "NY",
                    zipCode: `1${index + 1}0${index + 1}${index + 1}`,
                    country: "USA"
                },
                location: {
                    type: "Point",
                    coordinates: loc.coords
                },
                contact: {
                    phone: `+1-${index + 2}12-555-0${index + 6}0${index + 6}`,
                    emergencyPhone: `+1-${index + 2}12-555-09${index + 6}${index + 6}`,
                    email: `emergency@${loc.name.toLowerCase().replace(' ', '')}.com`
                },
                capacity: {
                    totalBeds: 100 + index * 50,
                    availableBeds: 10 + index * 3,
                    icuBeds: 10 + index * 5,
                    availableIcuBeds: 1 + index,
                    emergencyRooms: 4 + index * 2,
                    availableEmergencyRooms: 1 + Math.floor(index / 2)
                },
                specialties: [
                    "Emergency Medicine",
                    "Surgery",
                    index % 2 === 0 ? "Cardiology" : "Neurology",
                    index % 3 === 0 ? "Pediatrics" : "Internal Medicine"
                ],
                emergencyServices: {
                    traumaLevel: index < 2 ? "Level II" : "Level III",
                    strokeCenter: index % 2 === 0,
                    heartAttackCenter: index % 3 === 0,
                    burnCenter: false,
                    poisonControl: index % 4 === 0,
                    psychiatric: index % 2 === 1,
                    pediatricEmergency: index % 3 === 0
                },
                equipment: {
                    mriMachine: index % 2 === 0,
                    ctScan: true,
                    xrayMachine: true,
                    ultrasound: true,
                    defibrillators: 5 + index * 3,
                    ventilators: 8 + index * 2,
                    ambulances: 2 + index,
                    helipad: index < 2,
                    bloodBank: index % 2 === 0,
                    pharmacy: true,
                    laboratory: true
                },
                staff: {
                    doctors: 30 + index * 10,
                    nurses: 80 + index * 20,
                    specialists: 10 + index * 5,
                    onCallStaff: 8 + index * 2
                },
                rating: {
                    overall: 3.5 + (index * 0.2),
                    emergency: 3.8 + (index * 0.15),
                    reviews: 200 + index * 50
                },
                averageWaitTime: 30 + index * 5
            };
            additionalHospitals.push(hospital);
        });

        const moreHospitals = await Hospital.insertMany(additionalHospitals);
        logger.info(`Inserted ${moreHospitals.length} additional hospitals`);

        const totalHospitals = await Hospital.countDocuments();
        logger.info(`Database seeded successfully with ${totalHospitals} total hospitals`);

        // Test geospatial query
        const nearbyTest = await Hospital.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [-73.9857, 40.7484] // Times Square
                    },
                    $maxDistance: 5000 // 5km
                }
            }
        });

        logger.info(`Geospatial test: Found ${nearbyTest.length} hospitals within 5km of Times Square`);

        mongoose.connection.close();
        logger.info('Database seeding completed successfully');

    } catch (error) {
        logger.error('Database seeding failed:', error);
        process.exit(1);
    }
}

// Run seeding if called directly
if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;