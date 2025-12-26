import request from 'supertest';
import { App } from '../../app';
import { postgresDB } from '../../database/postgres';

describe('Auth Integration Tests', () => {
  let app: App;
  let server: any;

  beforeAll(async () => {
    app = new App();
    await app.connectDatabases();
    await app.runDatabaseMigrations();
    server = app.app;
  });

  afterAll(async () => {
    // Clean up test data
    await postgresDB.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({
          email: 'test-register@example.com',
          password: 'TestPassword123!',
          name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toBeDefined();
      expect(response.body.tokens).toBeDefined();
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
    });

    it('should fail with duplicate email', async () => {
      // First registration
      await request(server)
        .post('/api/v1/auth/register')
        .send({
          email: 'test-duplicate@example.com',
          password: 'TestPassword123!',
          name: 'Test User',
        });

      // Duplicate registration
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({
          email: 'test-duplicate@example.com',
          password: 'TestPassword123!',
          name: 'Test User 2',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email already registered');
    });

    it('should fail with invalid data', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'short',
          name: 'T',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeAll(async () => {
      // Create a test user
      await request(server)
        .post('/api/v1/auth/register')
        .send({
          email: 'test-login@example.com',
          password: 'TestPassword123!',
          name: 'Login Test User',
        });
    });

    it('should login successfully', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'test-login@example.com',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.tokens).toBeDefined();
    });

    it('should fail with wrong password', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'test-login@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail with non-existent user', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({
          email: 'test-refresh@example.com',
          password: 'TestPassword123!',
          name: 'Refresh Test User',
        });

      refreshToken = response.body.tokens.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.tokens).toBeDefined();
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' });

      expect(response.status).toBe(401);
    });
  });
});
