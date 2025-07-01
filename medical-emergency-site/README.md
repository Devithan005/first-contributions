# Emergency Care Locator

A comprehensive medical emergency response system that helps patients find the nearest equipped hospitals and coordinates ambulance dispatch during medical emergencies.

## 🚨 Important Notice

This system is designed to **complement, not replace** emergency services. For immediate life-threatening emergencies, always call **911** first.

## Features

### For Patients
- **Phone Number Verification**: Secure tracking and communication
- **Location Tracking**: GPS-based location detection with manual override
- **Emergency Type Selection**: Specialized matching based on medical condition
- **Hospital Finding**: AI-powered matching with nearest equipped hospitals
- **Real-time Updates**: Live tracking of ambulance and hospital status
- **SMS Notifications**: Automatic updates throughout the emergency response

### For Healthcare Providers
- **Hospital Management**: Real-time capacity and equipment tracking
- **Ambulance Dispatch**: Automated dispatch with ETA calculations
- **Emergency Coordination**: Integration with existing emergency services
- **Analytics Dashboard**: Emergency response statistics and performance metrics

### Technical Features
- **Real-time Communication**: WebSocket-based live updates
- **Geospatial Search**: MongoDB geospatial queries for location-based services
- **Multi-provider Geocoding**: Google Maps + OpenStreetMap fallback
- **Rate Limiting**: Protection against abuse
- **Comprehensive Logging**: Detailed audit trails for emergency responses
- **Error Handling**: Graceful degradation with emergency contact information

## Technology Stack

### Frontend
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Modern responsive design with medical color scheme
- **JavaScript (ES6+)**: Async/await API communication
- **FontAwesome**: Medical and emergency icons
- **Geolocation API**: Browser-based location services

### Backend
- **Node.js**: JavaScript runtime for server-side logic
- **Express.js**: Web application framework
- **MongoDB**: Document database with geospatial indexing
- **Mongoose**: Object modeling for MongoDB
- **Socket.io**: Real-time bidirectional communication
- **Express Validator**: Input validation and sanitization

### Services & APIs
- **Google Maps API**: Geocoding and places search
- **OpenStreetMap Nominatim**: Free geocoding fallback
- **Twilio**: SMS notifications (configurable)
- **SendGrid/AWS SES**: Email notifications (configurable)

## Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- Git

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/your-repo/emergency-care-locator.git
cd emergency-care-locator/medical-emergency-site
```

2. **Install dependencies**
```bash
cd backend
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start MongoDB**
```bash
# Using MongoDB service
sudo systemctl start mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

5. **Seed the database (optional)**
```bash
npm run seed
```

6. **Start the development server**
```bash
npm run dev
```

7. **Open the frontend**
Open `medical-emergency-site/index.html` in your browser or serve it with a local web server:
```bash
# Using Python
python -m http.server 8080

# Using Node.js http-server
npx http-server -p 8080
```

The application will be available at:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

## Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/medical_emergency_db

# External APIs (Optional but recommended)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Security
JWT_SECRET=your_super_secret_jwt_key
CORS_ORIGIN=http://localhost:8080

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### API Keys Setup

1. **Google Maps API** (Recommended)
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Geocoding API and Places API
   - Create credentials and add to `.env`

2. **Twilio SMS** (Optional)
   - Sign up at [Twilio](https://www.twilio.com/)
   - Get Account SID, Auth Token, and Phone Number
   - Add to `.env`

*Note: The system will work without these APIs using free alternatives, but with reduced functionality.*

## API Documentation

### Emergency Endpoints

#### Submit Emergency
```http
POST /api/emergency/submit
Content-Type: application/json

{
  "sessionId": "uuid-v4",
  "phoneNumber": "+1234567890",
  "patientName": "John Doe",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "123 Main St, New York, NY"
  },
  "emergencyType": "cardiac",
  "description": "Chest pain and difficulty breathing",
  "severity": "critical"
}
```

#### Get Emergency Status
```http
GET /api/emergency/status/{emergencyId}
```

#### Update Emergency Status
```http
PATCH /api/emergency/status/{emergencyId}
Content-Type: application/json

{
  "status": "ambulance_dispatched",
  "updatedBy": "dispatch_system",
  "details": "Unit Alpha-1 dispatched"
}
```

### Hospital Endpoints

#### Find Nearby Hospitals
```http
GET /api/hospitals?latitude=40.7128&longitude=-74.0060&specialty=Cardiology
```

#### Get Hospital Details
```http
GET /api/hospitals/{hospitalId}
```

#### Update Hospital Capacity
```http
PATCH /api/hospitals/{hospitalId}/capacity
Content-Type: application/json

{
  "availableBeds": 45,
  "availableIcuBeds": 8,
  "availableEmergencyRooms": 3
}
```

### Geocoding Endpoints

#### Reverse Geocoding
```http
POST /api/geocode/reverse
Content-Type: application/json

{
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

## Database Schema

### Emergency Collection
- Patient information and contact details
- Location data with geospatial indexing
- Emergency type and severity classification
- Hospital assignment and ambulance tracking
- Timeline of events and status updates
- Communication logs and metadata

### Hospital Collection
- Basic information and contact details
- Geospatial location data
- Capacity and resource availability
- Specialties and emergency services
- Equipment and staff information
- Real-time status updates

## Deployment

### Production Deployment

1. **Environment Setup**
```bash
NODE_ENV=production
MONGODB_URI=mongodb://your-production-db:27017/medical_emergency_db
# Add production API keys and secrets
```

2. **Build and Deploy**
```bash
npm run build
npm start
```

3. **Process Management**
```bash
# Using PM2
npm install -g pm2
pm2 start server.js --name emergency-care-api
pm2 startup
pm2 save
```

4. **Reverse Proxy (Nginx)**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location / {
        root /path/to/frontend;
        try_files $uri $uri/ /index.html;
    }
}
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ .
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/medical_emergency_db
    depends_on:
      - mongo
      
  mongo:
    image: mongo:5
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      
volumes:
  mongodb_data:
```

## Security Considerations

### Data Protection
- Patient data is encrypted in transit and at rest
- Phone numbers are masked in logs
- Session-based tracking without persistent user accounts
- Rate limiting to prevent abuse

### HIPAA Compliance Notes
- This demo system is **not HIPAA compliant**
- For healthcare use, implement:
  - End-to-end encryption
  - Access controls and audit logs
  - Data retention policies
  - Business Associate Agreements

### Security Best Practices
- Use HTTPS in production
- Implement proper authentication for hospital staff
- Regular security audits and updates
- Monitor for suspicious activity

## Monitoring and Logging

### Application Logs
- Structured JSON logging
- Emergency-specific log categories
- Performance metrics tracking
- Error tracking and alerts

### Health Monitoring
```bash
# Health check endpoint
curl http://localhost:3000/health

# System metrics
curl http://localhost:3000/api/emergency/statistics
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Add tests for new features
- Update documentation
- Ensure emergency scenarios still work

## Support

### Emergency Support
- **Life-threatening emergencies**: Call 911 immediately
- **System issues during emergency**: Call +1-555-EMERGENCY-SUPPORT

### Technical Support
- **GitHub Issues**: Bug reports and feature requests
- **Email**: support@emergency-care-locator.com
- **Documentation**: Full API docs available at `/docs`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This system is provided as-is for emergency assistance purposes. While we strive for accuracy and reliability, always prioritize calling 911 for life-threatening emergencies. The developers are not responsible for any delays or issues in emergency response.

---

**Built with ❤️ for saving lives through technology**