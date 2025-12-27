# Real-Time Collaborative Workspace Backend

A production-grade, scalable backend service that powers real-time collaborative workspaces for developers. Built with Node.js, TypeScript, Express, PostgreSQL, MongoDB, Redis, and WebSockets.

## 🚀 Features

### Core Functionality
- **Secure Authentication & Authorization**
  - JWT-based authentication with refresh tokens
  - Role-based access control (Owner, Collaborator, Viewer)
  - Token refresh mechanism
  - API rate limiting

- **Project & Workspace Management**
  - RESTful APIs for project CRUD operations
  - Workspace management
  - Collaborator invitations and role management
  - OpenAPI/Swagger documentation

- **Real-Time Collaboration**
  - WebSocket-based communication
  - Event broadcasting (user join/leave, file changes, activity updates)
  - Redis Pub/Sub for horizontal scaling
  - Session management

- **Asynchronous Job Processing**
  - Bull queue for background job processing
  - Support for multiple job types (code execution, data processing, reports)
  - Retry logic with exponential backoff
  - Idempotent job processing
  - Job status tracking

### Technical Highlights
- **Multi-Database Architecture**
  - PostgreSQL for relational data
  - MongoDB for activity logs and sessions
  - Redis for caching and message brokering

- **Production-Ready**
  - Comprehensive error handling
  - Security best practices (Helmet, CORS, input validation)
  - Request logging and monitoring
  - Graceful shutdown handling

- **Testing**
  - Unit tests for business logic
  - Integration tests for API endpoints
  - ~70% test coverage

- **DevOps**
  - Dockerized services
  - Docker Compose for local development
  - CI/CD pipeline with GitHub Actions
  - Horizontal scalability support

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker and Docker Compose (for containerized setup)
- PostgreSQL 15+ (if running locally)
- MongoDB 7+ (if running locally)
- Redis 7+ (if running locally)

## 🛠️ Installation & Setup

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Backend developer_Assessment_December
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Verify services are running**
   ```bash
   docker-compose ps
   ```

5. **Access the application**
   - API: http://localhost:3000
   - API Documentation: http://localhost:3000/api/docs
   - WebSocket: ws://localhost:3001

### Option 2: Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup databases**
   - Start PostgreSQL, MongoDB, and Redis
   - Create database: `collaborative_workspace`

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Update .env with your local database credentials
   ```

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Start the application**
   ```bash
   # Development mode with hot reload
   npm run dev

   # Production mode
   npm run build
   npm start
   ```

6. **Start the background worker (in a separate terminal)**
   ```bash
   npm run worker
   ```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### Project Endpoints

#### Create Project
```http
POST /api/v1/projects
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "My Project",
  "description": "Project description"
}
```

#### Get All Projects
```http
GET /api/v1/projects
Authorization: Bearer <access-token>
```

#### Get Project by ID
```http
GET /api/v1/projects/:projectId
Authorization: Bearer <access-token>
```

#### Update Project
```http
PUT /api/v1/projects/:projectId
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

#### Invite Member
```http
POST /api/v1/projects/:projectId/members
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "email": "member@example.com",
  "role": "collaborator"
}
```

### Workspace Endpoints

#### Create Workspace
```http
POST /api/v1/projects/:projectId/workspaces
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Development Workspace",
  "settings": {}
}
```

### Job Endpoints

#### Create Job
```http
POST /api/v1/jobs
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "type": "code_execution",
  "payload": {
    "code": "console.log('Hello World')",
    "language": "javascript"
  }
}
```

#### Get Job Status
```http
GET /api/v1/jobs/:jobId
Authorization: Bearer <access-token>
```

### WebSocket Connection

Connect to WebSocket for real-time collaboration:

```javascript
const ws = new WebSocket('ws://localhost:3001?token=<access-token>&projectId=<project-id>');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received event:', data);
};

// Send events
ws.send(JSON.stringify({
  type: 'file_changed',
  payload: {
    fileName: 'index.js',
    changes: '...'
  }
}));
```

## 🏗️ Architecture Overview

### System Architecture

```
┌─────────────────┐
│   Client Apps   │
└────────┬────────┘
         │
    ┌────┴────┐
    │  HTTPS  │  WebSocket
    └────┬────┘
         │
┌────────▼────────────┐
│  Load Balancer      │
└────────┬────────────┘
         │
    ┌────┴────────────────────┐
    │                         │
┌───▼───────┐         ┌──────▼──────┐
│  API      │         │  WebSocket  │
│  Server   │◄────────┤  Server     │
└───┬───────┘         └──────┬──────┘
    │                        │
    │  ┌─────────────────────┘
    │  │
┌───▼──▼───┐     ┌──────────┐     ┌─────────┐
│  Redis   │◄────┤  Worker  │◄────┤  Queue  │
│ Pub/Sub  │     │  Process │     │  (Bull) │
└──────────┘     └──────────┘     └─────────┘
    │
┌───▼──────────┐  ┌──────────┐  ┌──────────┐
│  PostgreSQL  │  │ MongoDB  │  │  Redis   │
│  (Main DB)   │  │ (Logs)   │  │ (Cache)  │
└──────────────┘  └──────────┘  └──────────┘
```

### Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Databases**: 
  - PostgreSQL (User data, Projects, Workspaces)
  - MongoDB (Activity logs, Sessions)
  - Redis (Caching, Pub/Sub, Job Queue)
- **Queue**: Bull (Redis-based)
- **WebSocket**: ws library
- **Authentication**: JWT
- **Validation**: Zod
- **Testing**: Jest, Supertest
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker, Docker Compose

### Design Patterns

- **Repository Pattern**: Data access abstraction
- **Service Layer**: Business logic separation
- **Middleware Pattern**: Cross-cutting concerns
- **Pub/Sub Pattern**: Real-time event distribution
- **Queue Pattern**: Asynchronous job processing

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Integration Tests Only
```bash
npm run test:integration
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

## 🔒 Security

### Implemented Security Measures

1. **Authentication & Authorization**
   - JWT with short-lived access tokens (15 minutes)
   - Long-lived refresh tokens (7 days) stored in Redis
   - Token rotation on refresh

2. **Input Validation**
   - Zod schema validation for all inputs
   - SQL injection prevention via parameterized queries
   - NoSQL injection prevention

3. **HTTP Security**
   - Helmet.js for security headers
   - CORS configuration
   - Rate limiting (100 requests per 15 minutes)
   - Stricter rate limiting on auth endpoints (5 requests per 15 minutes)

4. **Data Protection**
   - Password hashing with bcrypt (10 rounds)
   - Secrets management via environment variables
   - No sensitive data in logs

## 📊 Monitoring & Observability

### Logging
- Winston logger with multiple transports
- Log levels: error, warn, info, debug
- Structured logging with JSON format
- Separate error and combined log files

### Health Check
```http
GET /health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2025-12-26T10:30:00.000Z",
  "uptime": 3600
}
```

## 🚀 Deployment

### Environment Variables

Required environment variables for production:

```env
# Server
NODE_ENV=production
PORT=3000
API_VERSION=v1

# PostgreSQL
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_DB=collaborative_workspace
POSTGRES_USER=your-username
POSTGRES_PASSWORD=your-secure-password

# MongoDB
MONGODB_URI=mongodb://your-mongodb-uri

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-very-secure-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-very-secure-refresh-secret-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Feature Flags
FEATURE_REAL_TIME_COLLABORATION=true
FEATURE_CODE_EXECUTION=true
```

### Deployment Options

#### 1. Docker Compose
```bash
docker-compose -f docker-compose.yml up -d
```

#### 2. Kubernetes
```bash
# Apply Kubernetes manifests (to be created based on your cluster)
kubectl apply -f k8s/
```

#### 3. Cloud Platforms

**AWS**
- Deploy containers to ECS/Fargate
- Use RDS for PostgreSQL
- Use DocumentDB for MongoDB
- Use ElastiCache for Redis

**Google Cloud**
- Deploy to Cloud Run or GKE
- Use Cloud SQL for PostgreSQL
- Use MongoDB Atlas
- Use Memorystore for Redis

**Azure**
- Deploy to Container Instances or AKS
- Use Azure Database for PostgreSQL
- Use Cosmos DB
- Use Azure Cache for Redis

## 📈 Scalability Considerations

### Horizontal Scaling
- Stateless API servers (can run multiple instances)
- Redis Pub/Sub for WebSocket event distribution across instances
- Load balancer for traffic distribution
- Separate worker processes for job processing

### Performance Optimizations
- Connection pooling for PostgreSQL
- Redis caching for frequently accessed data
- Indexed database queries
- Asynchronous/non-blocking operations
- Efficient WebSocket message handling

### Database Scaling
- Read replicas for PostgreSQL
- MongoDB sharding for large datasets
- Redis Sentinel for high availability
- Database query optimization

## 🔧 Development

### Code Quality
```bash
# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
```

### Database Migrations
```bash
# Run migrations
npm run migrate
```

### Project Structure
```
src/
├── config/           # Configuration files
├── controllers/      # Request handlers
├── database/         # Database connections and migrations
├── middleware/       # Express middlewares
├── models/           # MongoDB models
├── queue/            # Job queue implementation
├── routes/           # API routes
├── services/         # Business logic
├── tests/            # Test files
│   ├── unit/         # Unit tests
│   └── integration/  # Integration tests
├── types/            # TypeScript types and interfaces
├── utils/            # Utility functions
├── validators/       # Input validation schemas
├── websocket/        # WebSocket server
├── workers/          # Background workers
├── app.ts            # Express app setup
└── server.ts         # Application entry point
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License

## 👥 Support

For issues and questions:
- Create an issue in the repository
- Email: support@example.com

## 🎯 Future Enhancements

- [ ] OAuth2 integration (Google, GitHub)
- [ ] Advanced analytics and metrics
- [ ] File storage integration (S3, GCS)
- [ ] Email notifications
- [ ] Webhook support
- [ ] GraphQL API
- [ ] Advanced caching strategies
- [ ] Multi-tenancy support
- [ ] Audit logging
- [ ] Advanced monitoring with Prometheus/Grafana

---

**Built with ❤️ for Purple Merit Technologies Backend Developer Assessment**
