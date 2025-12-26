import request from 'supertest';
import { App } from '../../app';
import { postgresDB } from '../../database/postgres';

describe('Project Integration Tests', () => {
  let app: App;
  let server: any;
  let accessToken: string;
  let userId: string;
  let projectId: string;

  beforeAll(async () => {
    app = new App();
    await app.connectDatabases();
    await app.runDatabaseMigrations();
    server = app.app;

    // Create a test user and get token
    const response = await request(server)
      .post('/api/v1/auth/register')
      .send({
        email: 'test-project@example.com',
        password: 'TestPassword123!',
        name: 'Project Test User',
      });

    accessToken = response.body.tokens.accessToken;
    userId = response.body.user.id;
  });

  afterAll(async () => {
    // Clean up
    await postgresDB.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
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

  describe('Project Members', () => {
    let secondUserToken: string;

    beforeAll(async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({
          email: 'test-member@example.com',
          password: 'TestPassword123!',
          name: 'Member Test User',
        });

      secondUserToken = response.body.tokens.accessToken;
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
  });
});
