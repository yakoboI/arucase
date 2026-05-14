# Arusha Catholic Seminary - React Frontend

Modern React frontend for the School Management System.

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env file with your API URL
# VITE_API_URL=http://localhost:5000
```

### Development

```bash
# Start development server
npm run dev

# The app will be available at http://localhost:3000
```

### Building for Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable components
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── context/        # React Context providers
│   ├── hooks/          # Custom hooks
│   ├── utils/          # Utility functions
│   └── styles/         # CSS files
├── public/             # Static assets
└── package.json
```

## Features

- ⚛️ React 18 with modern hooks
- 🚀 Vite for fast development
- 🛣️ React Router for navigation
- 🔄 React Query for API state management
- 🔌 Socket.IO for real-time updates
- 📱 Responsive design
- 🎨 Modern UI components

## Environment Variables

See `.env.example` for required environment variables.

## Deployment

This frontend is designed to be deployed on Railway. See `railway.json` for configuration.

