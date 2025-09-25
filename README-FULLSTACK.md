# Construction Management Application - Full Stack Deployment

A comprehensive construction management application with React TypeScript frontend, Node.js/Express backend, PostgreSQL database, and AI integration.

## 🏗️ Architecture Overview

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with hot module replacement
- **State Management**: Context API with AuthContext
- **UI Components**: Custom component library with role-based access
- **Maps**: Leaflet integration for project location mapping
- **AI Integration**: Google Gemini API for construction insights
- **Offline Support**: Service worker with localStorage queue

### Backend (Node.js + Express)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with refresh token support
- **Caching**: Redis for sessions and performance
- **Real-time**: Socket.IO for live updates
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: Helmet, CORS, rate limiting, input validation

### Infrastructure
- **Containerization**: Docker with multi-service compose
- **Reverse Proxy**: Traefik with automatic SSL (Let's Encrypt)
- **Monitoring**: Prometheus, Grafana, Loki for logs
- **CI/CD**: GitHub Actions with automated testing and deployment
- **Security**: Fail2ban, automated backups, security scanning

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ 
- Docker and Docker Compose
- Git

### 1. Clone and Setup
```bash
git clone <repository-url>
cd final

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Environment Configuration
```bash
# Copy environment files
cp .env.example .env.local
cp backend/.env.example backend/.env

# Edit environment files with your configuration
# Frontend: Update VITE_GEMINI_API_KEY in .env.local
# Backend: Update database and Redis credentials in backend/.env
```

### 3. Start with Docker (Recommended)
```bash
# Development environment
docker-compose up -d

# Check services are running
docker-compose ps
```

### 4. Manual Development Setup
```bash
# Start PostgreSQL and Redis (using Docker)
docker-compose up -d postgres redis

# Start backend development server
cd backend
npm run dev:init  # Runs migrations and starts server

# Start frontend development server (in new terminal)
cd ..
npm run dev
```

## 📁 Project Structure

```
final/
├── src/                          # Frontend React app
│   ├── components/               # React components
│   │   ├── ui/                  # Reusable UI components
│   │   ├── auth/                # Authentication components
│   │   ├── layout/              # Layout components
│   │   └── [Feature]View.tsx    # Main view components
│   ├── services/                # Frontend services
│   ├── hooks/                   # Custom React hooks
│   ├── contexts/                # React Context providers
│   └── types.ts                 # TypeScript type definitions
├── backend/                     # Backend API server
│   ├── src/
│   │   ├── routes/             # Express route handlers
│   │   ├── middleware/         # Express middleware
│   │   ├── services/           # Business logic services
│   │   ├── database/           # Database connection and models
│   │   ├── utils/              # Utility functions
│   │   └── server.ts           # Main server entry point
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── migrations/         # Database migrations
│   └── scripts/                # Development and deployment scripts
├── monitoring/                  # Monitoring configurations
│   ├── prometheus.yml          # Prometheus config
│   ├── grafana/                # Grafana dashboards
│   └── loki.yml                # Log aggregation config
├── security/                    # Security configurations
├── .github/
│   └── workflows/              # GitHub Actions CI/CD
├── docker-compose.yml          # Development environment
├── docker-compose.staging.yml  # Staging environment
├── docker-compose.production.yml # Production environment
└── FULL_STACK_DEPLOYMENT_PLAN.md # Detailed deployment guide
```

## 🔧 Available Commands

### Frontend Commands
```bash
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build
npm run test            # Run tests
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript checks
```

### Backend Commands
```bash
cd backend
npm run dev             # Start development server
npm run dev:init        # Initialize and start (runs migrations)
npm run build          # Build for production
npm run start          # Start production server
npm run test           # Run tests
npm run db:migrate     # Run database migrations
npm run db:seed        # Seed database with sample data
npm run db:studio      # Open Prisma Studio (database GUI)
```

### Docker Commands
```bash
# Development
docker-compose up -d                    # Start all services
docker-compose down                     # Stop all services
docker-compose logs -f [service]        # View service logs

# Production deployment
docker-compose -f docker-compose.production.yml up -d
```

## 🌐 API Documentation

Once the backend is running, visit:
- **API Documentation**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/health

### Key API Endpoints
```
Authentication:
  POST /api/auth/login
  POST /api/auth/register
  POST /api/auth/refresh
  DELETE /api/auth/logout

Projects:
  GET    /api/projects          # List projects
  POST   /api/projects          # Create project
  GET    /api/projects/:id      # Get project details
  PUT    /api/projects/:id      # Update project
  DELETE /api/projects/:id      # Delete project

Tasks:
  GET    /api/tasks             # List tasks
  POST   /api/tasks             # Create task
  GET    /api/tasks/:id         # Get task details
  PUT    /api/tasks/:id         # Update task
  POST   /api/tasks/:id/time    # Start/stop time tracking

Users:
  GET    /api/users             # List users (admin)
  GET    /api/users/me          # Get current user
  PUT    /api/users/me          # Update profile
  PUT    /api/users/:id         # Update user (admin)
  GET    /api/users/:id/activity # Get user activity
```

## 🔐 Security Features

### Authentication & Authorization
- JWT tokens with refresh token rotation
- Role-based access control (OWNER, ADMIN, PROJECT_MANAGER, FOREMAN, WORKER, CLIENT)
- Password hashing with bcrypt (12 rounds)
- Session management with Redis

### API Security
- Helmet.js for security headers
- CORS configuration with origin validation
- Rate limiting (100 requests per 15 minutes)
- Input validation with Zod schemas
- SQL injection prevention with Prisma ORM

### Infrastructure Security
- Fail2ban for brute force protection
- Automated SSL certificates with Let's Encrypt
- Security scanning with Trivy
- Environment variable encryption
- Regular security audits via GitHub Actions

## 📊 Monitoring & Observability

### Metrics (Prometheus + Grafana)
- Application performance metrics
- Database connection metrics
- API response times and error rates
- Resource utilization (CPU, memory, disk)

### Logging (Loki + Promtail)
- Structured application logs
- Request/response logging
- Error tracking and alerting
- Log aggregation and search

### Health Checks
- Application health endpoints
- Database connectivity checks
- Redis connectivity checks
- Automated uptime monitoring

## 🚢 Deployment

### Staging Deployment
```bash
# Deploy to staging
git push origin develop

# Manual deployment
docker-compose -f docker-compose.staging.yml up -d
```

### Production Deployment
```bash
# Deploy to production (requires approval)
git push origin main

# Manual deployment
docker-compose -f docker-compose.production.yml up -d
```

### Environment Variables

#### Required Frontend Variables (.env.local)
```env
VITE_API_URL=http://localhost:3001/api
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

#### Required Backend Variables (backend/.env)
```env
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/construction_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-very-long-jwt-secret-here
JWT_REFRESH_SECRET=your-very-long-jwt-refresh-secret-here
GEMINI_API_KEY=your_gemini_api_key_here
```

## 🔄 CI/CD Pipeline

The GitHub Actions pipeline includes:

### Testing Phase
- Frontend unit tests and linting
- Backend unit tests with test database
- TypeScript compilation checks
- Security vulnerability scanning

### Build Phase
- Frontend production build
- Backend TypeScript compilation
- Docker image builds for staging/production
- Multi-architecture support (AMD64, ARM64)

### Deployment Phase
- Automated staging deployment on `develop` branch
- Production deployment on `main` branch (with approval)
- Database migrations
- Health checks and rollback on failure
- Slack notifications

## 📈 Performance Optimization

### Frontend
- Code splitting with React.lazy()
- Image optimization and lazy loading
- Service worker for offline functionality
- Bundle analysis and tree shaking

### Backend  
- Database query optimization with Prisma
- Redis caching for frequently accessed data
- Connection pooling for database
- Response compression with gzip

### Infrastructure
- CDN for static assets
- Load balancing with multiple backend instances
- Database read replicas for scaling
- Monitoring and alerting for performance issues

## 🛠️ Development Workflow

### 1. Feature Development
```bash
git checkout -b feature/new-feature
# Make changes
npm run test        # Run tests
npm run lint        # Check code quality
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### 2. Code Review Process
- Create pull request to `develop` branch
- Automated CI checks must pass
- Code review required from team member
- Merge to `develop` triggers staging deployment

### 3. Production Release
- Create pull request from `develop` to `main`
- Additional approval required for production
- Merge triggers production deployment
- Monitor deployment and rollback if needed

## 📚 Additional Resources

- [Full Stack Deployment Plan](./FULL_STACK_DEPLOYMENT_PLAN.md) - Detailed deployment guide
- [API Documentation](http://localhost:3001/api/docs) - Interactive API documentation
- [Security Documentation](./SECURITY.md) - Security policies and procedures
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute to the project

## 🆘 Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check database connection
docker-compose logs postgres

# Reset database
cd backend
npm run db:reset

# Regenerate Prisma client
npm run db:generate
```

**Frontend build errors:**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run type-check
```

**Docker issues:**
```bash
# Reset Docker environment
docker-compose down -v
docker system prune -f
docker-compose up -d
```

### Getting Help

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Review the logs: `docker-compose logs [service]`
3. Verify environment variables are set correctly
4. Ensure all prerequisites are installed

---

## 🤝 Contributing

Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.