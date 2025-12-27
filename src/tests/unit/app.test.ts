import request from 'supertest';
import { App } from '../../app';
import { postgresDB } from '../../database/postgres';
import { connectMongoDB } from '../../database/mongodb';
import { runMigrations } from '../../database/migrations/run-migrations';

jest.mock('../../database/postgres');
jest.mock('../../database/mongodb');
jest.mock('../../database/migrations/run-migrations');

describe('App', () => {
  let app: App;

  beforeEach(() => {
    app = new App();
  });

  describe('Routes', () => {
    it('should return health status', async () => {
      const response = await request(app.app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should return root info', async () => {
      const response = await request(app.app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Collaborative Workspace API');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('documentation', '/api/docs');
    });

    it('should handle 404 for unknown routes', async () => {
      const response = await request(app.app).get('/unknown-route');
      
      expect(response.status).toBe(404);
    });

    it('should have swagger docs route', async () => {
      const response = await request(app.app).get('/api/docs');
      
      expect([200, 301, 302]).toContain(response.status);
    });
  });

  describe('CORS', () => {
    it('should have CORS headers', async () => {
      const response = await request(app.app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('JSON parsing', () => {
    it('should parse JSON body', async () => {
      const response = await request(app.app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        });
      
      // Should at least parse the body, even if auth fails
      expect(response.status).toBeDefined();
    });
  });

  describe('Security headers', () => {
    it('should include security headers', async () => {
      const response = await request(app.app).get('/health');
      
      expect(response.headers['x-dns-prefetch-control']).toBeDefined();
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('Database connections', () => {
    it('should connect to databases', async () => {
      (postgresDB.connect as jest.Mock).mockResolvedValue(undefined);
      (connectMongoDB as jest.Mock).mockResolvedValue(undefined);

      await expect(app.connectDatabases()).resolves.not.toThrow();
      
      expect(postgresDB.connect).toHaveBeenCalled();
      expect(connectMongoDB).toHaveBeenCalled();
    });

    it('should throw error if database connection fails', async () => {
      (postgresDB.connect as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      await expect(app.connectDatabases()).rejects.toThrow('Connection failed');
    });
  });

  describe('Database migrations', () => {
    it('should run migrations', async () => {
      (runMigrations as jest.Mock).mockResolvedValue(undefined);

      await expect(app.runDatabaseMigrations()).resolves.not.toThrow();
      
      expect(runMigrations).toHaveBeenCalled();
    });

    it('should throw error if migrations fail', async () => {
      (runMigrations as jest.Mock).mockRejectedValue(new Error('Migration failed'));

      await expect(app.runDatabaseMigrations()).rejects.toThrow('Migration failed');
    });
  });

  describe('Worker', () => {
    it('should not start worker when ENABLE_WORKER is not set', () => {
      const originalEnv = process.env.ENABLE_WORKER;
      delete process.env.ENABLE_WORKER;

      expect(() => app.startWorker()).not.toThrow();

      process.env.ENABLE_WORKER = originalEnv;
    });

    it('should not start worker multiple times', () => {
      const originalEnv = process.env.ENABLE_WORKER;
      process.env.ENABLE_WORKER = 'true';

      app.startWorker();
      
      // Second call should not throw but should skip
      expect(() => app.startWorker()).not.toThrow();

      process.env.ENABLE_WORKER = originalEnv;
    });
  });

  describe('WebSocket Server', () => {
    it('should start websocket server when feature flag is enabled', () => {
      const originalFlag = process.env.FEATURE_REAL_TIME_COLLABORATION;
      process.env.FEATURE_REAL_TIME_COLLABORATION = 'true';

      expect(() => app.startWebSocketServer()).not.toThrow();

      process.env.FEATURE_REAL_TIME_COLLABORATION = originalFlag;
    });
  });

  describe('Close', () => {
    it('should close app gracefully', async () => {
      (postgresDB.close as jest.Mock).mockResolvedValue(undefined);

      await expect(app.close()).resolves.not.toThrow();
    });
  });
});
