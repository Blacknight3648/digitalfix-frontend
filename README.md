# DigitalFix - Frontend

Frontend application for **DigitalFix**, an on-demand IT services marketplace built with Node.js, Express, MongoDB, and React.

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd digitalfix-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Environment configuration:
Create a `.env` file in the root directory:
```env
# API base URL
# For production (with API gateway)
VITE_API_BASE_URL=https://api.digitalfix.io/api/v1

# For development (direct access)
VITE_API_BASE_URL=http://localhost:5000/api/v1

# Optional: Firebase configuration (if needed)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

4. Run the application:
```bash
# Development mode (hot reload at http://localhost:5173)
npm run dev

# Build for production
npm run build

# Start production build
npm run start
```

---

## Architecture

### Frontend Components

**Users (Customers)**:
- Homepage
- User authentication (login, register, reset password)
- Service marketplace
- Booking and scheduling
- Payment integration (Stripe)
- Dashboard and order tracking

**Technicians (Experts)**:
- Technician registration and profile management
- Job discovery and acceptance
- Service time tracking
- Payment tracking
- Notifications

**Admin Panel**:
- User management
- Technician verification
- Service category management
- Review moderation
- System analytics

### API Integration

The frontend communicates with the backend via the **DigitalFix API Gateway**:
```
VITE_API_BASE_URL → https://api.digitalfix.io/api/v1
```

**Key API Endpoints**:
- Authentication: `/auth/*`
- Users: `/users/*`
- Technicians: `/technicians/*`
- Services: `/services/*`
- Bookings: `/bookings/*`
- Payments: `/payments/*`
- Admin: `/admin/*`

---

## Technology Stack

### Frontend
- **Framework**: React 18
- **Language**: JavaScript (ES6+)
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Routing**: React Router DOM
- **HTTP Client**: Axios

### Optional Integrations
- **Firebase**: Push notifications
- **Stripe**: Payment processing
- **Google Maps**: Location-based services

---

## Project Structure

```
digitalfix-frontend/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── layout/        # Layout components (header, footer)
│   │   ├── ui/          # UI primitives (buttons, inputs)
│   │   ├── auth/        # Authentication components
│   │   ├── user/        # User-specific components
│   │   ├── technician/  # Technician components
│   │   ├── admin/       # Admin components
│   │   └── common/      # Shared components
│   ├── pages/           # Page components
│   │   ├── auth/        # Authentication pages
│   │   ├── user/        # User pages
│   │   ├── technician/  # Technician pages
│   │   ├── admin/       # Admin pages
│   │   └── landing/     # Marketing pages
│   ├── services/        # API service modules
│   ├── contexts/        # React Context providers
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   ├── assets/          # Static assets
│   └── App.jsx          # Main application component
├── public/              # Publicly accessible files
├── .env                 # Environment variables
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
└── README.md            # Project documentation
```

---

## Roles & Permissions

### User (Customer)
- Browse and search services
- Book and schedule services
- Make payments
- Manage profile and bookings

### Technician (Expert)
- Register and get verified
- Accept and manage jobs
- Track time and earnings
- Update profile and availability

### Admin
- Manage all users and technicians
- Moderate content and reviews
- Track system analytics
- Configure system settings

---

## Security

- JWT-based authentication
- Role-based access control
- HTTPS for secure communication
- API gateway for security and rate limiting
- Input validation and sanitization
- Environment variable management

---

## Development

### Development Commands

```bash
# Start development server (hot reload)
npm run dev

# Run lint checks
npm run lint

# Run tests
npm run test
```

### Adding a New Service

1. Add service to `src/services/api.js`
2. Create new page in `src/pages/`
3. Add navigation in `src/components/layout/Header.jsx`
4. Update routes in `App.jsx`

### Adding a New Page

```bash
# Create new page component
src/pages/my-new-page.jsx

# Add to router in App.jsx
<Route path="/my-new-page" element={<MyNewPage />} />

# Import and use in navigation
import MyNewPage from '@/pages/my-new-page'

# In header component
<Link to="/my-new-page">My New Page</Link>
```

---

## 🧪 Testing

The project uses Jest for unit testing and React Testing Library for component testing.

```bash
# Run all tests
npm run test

# Run tests with watch mode
npm run test:watch
```

---

## Production Build

```bash
# Build for production
npm run build

# Serve production build locally
npm run preview

# Start production server (using serve package)
npm run start
```

The build process creates an optimized production bundle in the `dist/` directory.

---

## API Integration

The frontend uses Axios to communicate with the backend API:

```javascript
import axios from '@/services/api'

// Get all services
export const getServices = async () => {
  const response = await axios.get('/services')
  return response.data
}

// Create booking
export const createBooking = async (bookingData) => {
  const response = await axios.post('/bookings', bookingData)
  return response.data
}
```

---

## Documentation

- [API Documentation](https://digitalfix.io/api-docs) (Backend)
- [Architecture Overview](https://digitalfix.io/docs/architecture)
- [Deployment Guide](https://digitalfix.io/docs/deployment)
- [Contribution Guidelines](https://digitalfix.io/docs/contributing)

---

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request
5. Ensure code follows project style guidelines

---

## Support

For issues or questions, please:
1. Check the [FAQ](https://digitalfix.io/faq)
2. Search [GitHub Issues](https://
