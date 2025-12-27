// Set NODE_ENV before importing any application code
process.env.NODE_ENV = 'test';

import request from 'supertest';
import { App } from '../../app';
import { postgresDB } from '../../database/postgres';

describe('Workspace Integration Tests', () => {
  let app: App;
  let server: any;
  let accessToken: string;
  let projectId: string;
  let workspaceId: string;

  beforeAll(async () => {
    app = new App();
    await app.connectDatabases();
    await app.runDatabaseMigrations();
    server = app.app;

    // Clean up any leftover test data from previous failed runs
    try {
      await postgresDB.query('DELETE FROM workspaces WHERE project_id IN (SELECT id FROM projects WHERE owner_id IN (SELECT id FROM users WHERE email LIKE $1))', ['test%@example.com']);
      await postgresDB.query('DELETE FROM project_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
      await postgresDB.query('DELETE FROM projects WHERE owner_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
      await postgresDB.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
    } catch (error) {
      // Ignore cleanup errors on first run
    }

    // Create a test user and get token
    const userResponse = await request(server)
      .post('/api/v1/auth/register')
      .send({
        email: 'test-workspace@example.com',
        password: 'TestPassword123!',
        name: 'Workspace Test User',
      });

    accessToken = userResponse.body.tokens?.accessToken;

    if (!accessToken) {
      throw new Error('Failed to get access token for tests');
    }

    // Create a test project
    const projectResponse = await request(server)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Workspace Project',
        description: 'Project for workspace tests',
      });

    projectId = projectResponse.body.project?.id;

    if (!projectId) {
      throw new Error('Failed to create test project');
    }

    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Clean up in correct order
    try {
      await postgresDB.query('DELETE FROM workspaces WHERE project_id IN (SELECT id FROM projects WHERE owner_id IN (SELECT id FROM users WHERE email LIKE $1))', ['test%@example.com']);
      await postgresDB.query('DELETE FROM project_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
      await postgresDB.query('DELETE FROM projects WHERE owner_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
      await postgresDB.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    await app.close();
  });

  describe('POST /api/v1/projects/:projectId/workspaces', () => {
    it('should create a new workspace', async () => {
      const response = await request(server)
        .post(`/api/v1/projects/${projectId}/workspaces`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Workspace',
          settings: { theme: 'dark', autoSave: true },
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Workspace created successfully');
      expect(response.body.workspace).toBeDefined();
      expect(response.body.workspace.name).toBe('Test Workspace');

      workspaceId = response.body.workspace.id;

      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should fail without authentication', async () => {
      const response = await request(server)
        .post(`/api/v1/projects/${projectId}/workspaces`)
        .send({
          name: 'Test Workspace',
          settings: {},
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/projects/:projectId/workspaces', () => {
    it('should get project workspaces', async () => {
      const response = await request(server)
        .get(`/api/v1/projects/${projectId}/workspaces`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.workspaces).toBeDefined();
      expect(Array.isArray(response.body.workspaces)).toBe(true);
      expect(response.body.workspaces.length).toBeGreaterThan(0);
    });

    it('should fail without authentication', async () => {
      const response = await request(server)
        .get(`/api/v1/projects/${projectId}/workspaces`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/workspaces/:workspaceId', () => {
    it('should get workspace by id', async () => {
      const response = await request(server)
        .get(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.workspace).toBeDefined();
      expect(response.body.workspace.id).toBe(workspaceId);
    });

    it('should return 404 for non-existent workspace', async () => {
      const response = await request(server)
        .get('/api/v1/workspaces/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/workspaces/:workspaceId', () => {
    it('should update workspace', async () => {
      const response = await request(server)
        .put(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Workspace Name',
          settings: { theme: 'light', autoSave: false },
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Workspace updated successfully');
      expect(response.body.workspace.name).toBe('Updated Workspace Name');
    });

    it('should return 404 for non-existent workspace', async () => {
      const response = await request(server)
        .put('/api/v1/workspaces/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/workspaces/:workspaceId', () => {
    it('should delete workspace', async () => {
      const response = await request(server)
        .delete(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Workspace deleted successfully');

      // Verify deletion
      const getResponse = await request(server)
        .get(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent workspace', async () => {
      const response = await request(server)
        .delete('/api/v1/workspaces/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });
});
