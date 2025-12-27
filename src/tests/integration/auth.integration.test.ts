// Set NODE_ENV before importing any application code
process.env.NODE_ENV = 'test';

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

    // Clean up any leftover test data from previous failed runs
    try {
      await postgresDB.query(
        'DELETE FROM project_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)',
        ['test%@example.com']
      );
      await postgresDB.query(
        'DELETE FROM projects WHERE owner_id IN (SELECT id FROM users WHERE email LIKE $1)',
        ['test%@example.com']
      );
      await postgresDB.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
    } catch (error) {
      // Ignore cleanup errors on first run
    }
  });

  afterAll(async () => {
    // Clean up test data in correct order to avoid foreign key violations
    try {
      await postgresDB.query(
        'DELETE FROM project_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)',
        ['test%@example.com']
      );
      await postgresDB.query(
        'DELETE FROM projects WHERE owner_id IN (SELECT id FROM users WHERE email LIKE $1)',
        ['test%@example.com']
      );
      await postgresDB.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(server).post('/api/v1/auth/register').send({
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
      await request(server).post('/api/v1/auth/register').send({
        email: 'test-duplicate@example.com',
        password: 'TestPassword123!',
        name: 'Test User',
      });

      // Duplicate registration
      const response = await request(server).post('/api/v1/auth/register').send({
        email: 'test-duplicate@example.com',
        password: 'TestPassword123!',
        name: 'Test User 2',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email already registered');

      // Add delay between tests
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should fail with invalid data', async () => {
      const response = await request(server).post('/api/v1/auth/register').send({
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
      await request(server).post('/api/v1/auth/register').send({
        email: 'test-login@example.com',
        password: 'TestPassword123!',
        name: 'Login Test User',
      });
      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should login successfully', async () => {
      const response = await request(server).post('/api/v1/auth/login').send({
        email: 'test-login@example.com',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.tokens).toBeDefined();

      // Add delay between tests
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should fail with wrong password', async () => {
      const response = await request(server).post('/api/v1/auth/login').send({
        email: 'test-login@example.com',
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');

      // Add delay between tests
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should fail with non-existent user', async () => {
      const response = await request(server).post('/api/v1/auth/login').send({
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
      const response = await request(server).post('/api/v1/auth/register').send({
        email: 'test-refresh@example.com',
        password: 'TestPassword123!',
        name: 'Refresh Test User',
      });

      refreshToken = response.body.tokens?.refreshToken;

      if (!refreshToken) {
        console.error('Registration response for refresh test:', response.body);
        throw new Error(`Failed to get refresh token. Status: ${response.status}`);
      }

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should refresh token successfully', async () => {
      const response = await request(server).post('/api/v1/auth/refresh').send({ refreshToken });

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
