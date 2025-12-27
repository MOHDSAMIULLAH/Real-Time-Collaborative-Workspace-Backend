// Set NODE_ENV before importing any application code
process.env.NODE_ENV = 'test';

import request from 'supertest';
import { App } from '../../app';
import { postgresDB } from '../../database/postgres';
import { JobType } from '../../types/enums';

describe('Job Integration Tests', () => {
  let app: App;
  let server: any;
  let accessToken: string;
  let projectId: string;
  let jobId: string;

  beforeAll(async () => {
    app = new App();
    await app.connectDatabases();
    await app.runDatabaseMigrations();
    server = app.app;

    // Clean up any leftover test data
    try {
      await postgresDB.query('DELETE FROM project_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
      await postgresDB.query('DELETE FROM projects WHERE owner_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
      await postgresDB.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
    } catch (error) {
      // Ignore cleanup errors
    }

    // Create test user and get token
    const userResponse = await request(server)
      .post('/api/v1/auth/register')
      .send({
        email: 'test-job@example.com',
        password: 'TestPassword123!',
        name: 'Job Test User',
      });

    accessToken = userResponse.body.tokens?.accessToken;

    if (!accessToken) {
      throw new Error('Failed to get access token for tests');
    }

    // Create test project
    const projectResponse = await request(server)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Job Project',
        description: 'Project for job tests',
      });

    projectId = projectResponse.body.project?.id;

    if (!projectId) {
      throw new Error('Failed to create test project');
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Clean up
    try {
      await postgresDB.query('DELETE FROM project_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
      await postgresDB.query('DELETE FROM projects WHERE owner_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
      await postgresDB.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    await app.close();
  });

  describe('POST /api/v1/jobs', () => {
    it('should create a new job', async () => {
      const response = await request(server)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          type: JobType.EXPORT,
          payload: { format: 'pdf' },
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Job created successfully');
      expect(response.body.jobId).toBeDefined();

      jobId = response.body.jobId;

      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should fail without authentication', async () => {
      const response = await request(server)
        .post('/api/v1/jobs')
        .send({
          projectId,
          type: JobType.EXPORT,
          payload: {},
        });

      expect(response.status).toBe(401);
    });

    it('should accept job creation with any type', async () => {
      const response = await request(server)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          type: 'CUSTOM_TYPE',
          payload: {},
        });

      expect(response.status).toBe(201);
      expect(response.body.jobId).toBeDefined();
    });
  });

  describe('GET /api/v1/jobs/:jobId', () => {
    it('should get job by id', async () => {
      const response = await request(server)
        .get(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(jobId);
      expect(response.body.type).toBeDefined();
      expect(response.body.status).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const response = await request(server)
        .get(`/api/v1/jobs/${jobId}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(server)
        .get('/api/v1/jobs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/jobs', () => {
    it('should get all jobs for project', async () => {
      const response = await request(server)
        .get(`/api/v1/jobs?projectId=${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.jobs).toBeDefined();
      expect(Array.isArray(response.body.jobs)).toBe(true);
      expect(response.body.jobs.length).toBeGreaterThan(0);
    });

    it('should fail without authentication', async () => {
      const response = await request(server)
        .get(`/api/v1/jobs?projectId=${projectId}`);

      expect(response.status).toBe(401);
    });
  });
});
