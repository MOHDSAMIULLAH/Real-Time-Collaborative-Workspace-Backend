import * as schema from '../../database/schema';

describe('Database Schema', () => {
  it('should have users table defined', () => {
    expect(schema.users).toBeDefined();
  });

  it('should have projects table defined', () => {
    expect(schema.projects).toBeDefined();
  });

  it('should have workspaces table defined', () => {
    expect(schema.workspaces).toBeDefined();
  });

  it('should have projectMembers table defined', () => {
    expect(schema.projectMembers).toBeDefined();
  });

  it('should have jobs table defined', () => {
    expect(schema.jobs).toBeDefined();
  });

  it('should have usersRelations defined', () => {
    expect(schema.usersRelations).toBeDefined();
  });

  it('should have projectsRelations defined', () => {
    expect(schema.projectsRelations).toBeDefined();
  });

  it('should have workspacesRelations defined', () => {
    expect(schema.workspacesRelations).toBeDefined();
  });

  it('should have projectMembersRelations defined', () => {
    expect(schema.projectMembersRelations).toBeDefined();
  });
});
