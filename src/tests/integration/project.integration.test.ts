// Set NODE_ENV before importing any application code
process.env.NODE_ENV = 'test';

import request from 'supertest';
import { App } from '../../app';
import { postgresDB } from '../../database/postgres';

describe('Project Integration Tests', () => {
  let app: App;
  let server: any;
  let accessToken: string;
  let projectId: string;

  beforeAll(async () => {
    app = new App();
    await app.connectDatabases();
    await app.runDatabaseMigrations();
    server = app.app;
    
    // Clean up any leftover test data from previous failed runs
    try {
      await postgresDB.query('DELETE FROM project_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
      await postgresDB.query('DELETE FROM projects WHERE owner_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
      await postgresDB.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
    } catch (error) {
      // Ignore cleanup errors on first run
    }

    // Create a test user and get token
    const response = await request(server)
      .post('/api/v1/auth/register')
      .send({
        email: 'test-project@example.com',
        password: 'TestPassword123!',
        name: 'Project Test User',
      });

    accessToken = response.body.tokens?.accessToken;
    
    if (!accessToken) {
      console.error('Registration response:', response.body);
      throw new Error(`Failed to get access token for tests. Status: ${response.status}`);
    }

    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Clean up in correct order to avoid foreign key violations
    try {
      await postgresDB.query('DELETE FROM project_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
      await postgresDB.query('DELETE FROM projects WHERE owner_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
      await postgresDB.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    await app.close();
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project', async () => {
      const response = await request(server)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Project',
          description: 'This is a test project',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Project created successfully');
      expect(response.body.project).toBeDefined();
      expect(response.body.project.name).toBe('Test Project');

      projectId = response.body.project.id;
      
      // Add delay to ensure project member is committed
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should fail without authentication', async () => {
      const response = await request(server)
        .post('/api/v1/projects')
        .send({
          name: 'Test Project',
          description: 'This is a test project',
        });

      expect(response.status).toBe(401);
    });

    it('should fail with invalid data', async () => {
      const response = await request(server)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'T', // Too short
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should get user projects', async () => {
      const response = await request(server)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.projects).toBeDefined();
      expect(Array.isArray(response.body.projects)).toBe(true);
      expect(response.body.projects.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/projects/:projectId', () => {
    it('should get project by id', async () => {
      const response = await request(server)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.project).toBeDefined();
      expect(response.body.project.id).toBe(projectId);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(server)
        .get('/api/v1/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/projects/:projectId', () => {
    it('should update project', async () => {
      const response = await request(server)
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Project Name',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Project updated successfully');
      expect(response.body.project.name).toBe('Updated Project Name');
    });
  });

  describe('DELETE /api/v1/projects/:projectId', () => {
    it('should delete project', async () => {
      // Create a new project specifically for deletion test
      const createResponse = await request(server)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Project To Delete',
          description: 'This will be deleted',
        });

      const deleteProjectId = createResponse.body.project.id;
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(server)
        .delete(`/api/v1/projects/${deleteProjectId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Project deleted successfully');

      // Verify project is deleted or marked as deleted (soft delete may return archived project)
      const getResponse = await request(server)
        .get(`/api/v1/projects/${deleteProjectId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Project might be soft deleted (status 200 with deleted status) or truly deleted (404)
      expect([404, 200]).toContain(getResponse.status);
      if (getResponse.status === 200) {
        // If soft delete, check status is deleted
        expect(getResponse.body.project.status).toBe('deleted');
      }
    });

    it('should return 404 or 403 for non-existent project', async () => {
      const response = await request(server)
        .delete('/api/v1/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      // Can return 404 (not found) or 403 (forbidden - no access to non-existent project)
      expect([404, 403]).toContain(response.status);
    });
  });

  describe('Project Members', () => {
    beforeAll(async () => {
      await request(server)
        .post('/api/v1/auth/register')
        .send({
          email: 'test-member@example.com',
          password: 'TestPassword123!',
          name: 'Member Test User',
        });
      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should invite a member', async () => {
      const response = await request(server)
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'test-member@example.com',
          role: 'collaborator',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Member invited successfully');
    });

    it('should get project members', async () => {
      const response = await request(server)
        .get(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.members).toBeDefined();
      expect(response.body.members.length).toBeGreaterThanOrEqual(2);
    });

    it('should fail to invite non-existent user', async () => {
      const response = await request(server)
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'nonexistent@example.com',
          role: 'collaborator',
        });

      expect(response.status).toBe(404);
    });

    it('should fail to get members without authentication', async () => {
      const response = await request(server)
        .get(`/api/v1/projects/${projectId}/members`);

      expect(response.status).toBe(401);
    });

    it('should fail to invite member to non-existent project', async () => {
      const response = await request(server)
        .post('/api/v1/projects/00000000-0000-0000-0000-000000000000/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'test-member@example.com',
          role: 'collaborator',
        });

      expect([403, 404]).toContain(response.status);
    });
  });
});
