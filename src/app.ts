import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { swaggerSpec } from './config/swagger';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import workspaceRoutes from './routes/workspace.routes';
import jobRoutes from './routes/job.routes';

// Database
import { postgresDB } from './database/postgres';
import { connectMongoDB } from './database/mongodb';
import { redisClient } from './database/redis';
import { runMigrations } from './database/migrations/run-migrations';

// WebSocket
import { WebSocketServer } from './websocket/server';

export class App {
  public app: Express;
  private wsServer?: WebSocketServer;

  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandlers();
  }

  private setupMiddlewares(): void {
    // Security
    this.app.use(helmet());

    // CORS
    this.app.use(
      cors({
        origin: config.cors.origin,
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting (disabled in test environment)
    if (config.env !== 'test') {
      const limiter = rateLimit({
        windowMs: config.rateLimit.windowMs,
        max: config.rateLimit.max,
        message: 'Too many requests from this IP, please try again later',
      });
      this.app.use('/api/', limiter);
    } else {
      logger.info('Rate limiting disabled for test environment');
    }

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      next();
    });

    // Swagger documentation
    this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  private setupRoutes(): void {
    const apiPrefix = `/api/${config.apiVersion}`;

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // API routes
    this.app.use(`${apiPrefix}/auth`, authRoutes);
    this.app.use(`${apiPrefix}/projects`, projectRoutes);
    this.app.use(`${apiPrefix}`, workspaceRoutes);
    this.app.use(`${apiPrefix}/jobs`, jobRoutes);

    // Root
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Collaborative Workspace API',
        version: '1.0.0',
        documentation: '/api/docs',
      });
    });
  }

  private setupErrorHandlers(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  async connectDatabases(): Promise<void> {
    try {
      await postgresDB.connect();
      await connectMongoDB();
      logger.info('All databases connected successfully');
    } catch (error) {
      logger.error('Database connection failed', error);
      throw error;
    }
  }

  async runDatabaseMigrations(): Promise<void> {
    try {
      await runMigrations();
      logger.info('Database migrations completed');
    } catch (error) {
      logger.error('Database migrations failed', error);
      throw error;
    }
  }

  startWebSocketServer(): void {
    if (config.featureFlags.realTimeCollaboration) {
      this.wsServer = new WebSocketServer(config.websocket.port);
      logger.info(`WebSocket server started on port ${config.websocket.port}`);
    }
  }

  async start(): Promise<void> {
    try {
      // Connect to databases
      await this.connectDatabases();

      // Run migrations
      await this.runDatabaseMigrations();

      // Start WebSocket server
      this.startWebSocketServer();

      // Start HTTP server
      this.app.listen(config.port, () => {
        logger.info(`Server started on port ${config.port}`);
        logger.info(`Environment: ${config.env}`);
        logger.info(`API Documentation: http://localhost:${config.port}/api/docs`);
      });
    } catch (error) {
      logger.error('Failed to start application', error);
      process.exit(1);
    }
  }

  async close(): Promise<void> {
    logger.info('Closing application...');

    if (this.wsServer) {
      this.wsServer.close();
    }

    await postgresDB.close();
    await redisClient.close();

    logger.info('Application closed');
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});
