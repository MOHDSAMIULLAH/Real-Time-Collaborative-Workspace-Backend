process.env.NODE_ENV = 'test';

import { projectService, ProjectService } from '../../services/project.service';
import { db, postgresDB } from '../../database/postgres';
import { UserRole, ProjectStatus } from '../../types/enums';
import logger from '../../utils/logger';

jest.mock('../../database/postgres');
jest.mock('../../utils/logger');

describe('ProjectService', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    (postgresDB.getClient as jest.Mock).mockResolvedValue(mockClient);
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        description: 'Test Description',
        ownerId: 'user-123',
        status: ProjectStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockProject]),
        }),
      });

      (db.insert as jest.Mock).mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockProject]),
        }),
      }).mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined),
      });

      mockClient.query.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);

      const result = await projectService.createProject('Test Project', 'Test Description', 'user-123');

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Project');
      expect(result.ownerId).toBe('user-123');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      (db.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      mockClient.query.mockResolvedValue(undefined);

      await expect(
        projectService.createProject('Test', 'Desc', 'user-123')
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getProjectById', () => {
    it('should return project when found', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        description: 'Test Description',
        ownerId: 'user-123',
        status: ProjectStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockProject]),
          }),
        }),
      });

      const result = await projectService.getProjectById('project-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('project-123');
    });

    it('should return null when project not found', async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await projectService.getProjectById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getUserProjects', () => {
    it('should return user projects', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project 1',
          description: 'Desc 1',
          ownerId: 'user-123',
          status: ProjectStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'project-2',
          name: 'Project 2',
          description: 'Desc 2',
          ownerId: 'user-456',
          status: ProjectStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue(mockProjects),
            }),
          }),
        }),
      });

      const result = await projectService.getUserProjects('user-123');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });

  describe('updateProject', () => {
    it('should update project successfully', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Updated Project',
        description: 'Updated Description',
        ownerId: 'user-123',
        status: ProjectStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockProject]),
          }),
        }),
      });

      const result = await projectService.updateProject('project-123', {
        name: 'Updated Project',
        description: 'Updated Description',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Project');
    });
  });

  describe('deleteProject', () => {
    it('should delete project (soft delete)', async () => {
      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await projectService.deleteProject('project-123');

      expect(logger.info).toHaveBeenCalledWith('Project deleted: project-123');
    });
  });

  describe('getProjectMembers', () => {
    it('should return project members', async () => {
      const mockMembers = [
        {
          id: 'member-1',
          userId: 'user-123',
          email: 'user1@example.com',
          name: 'User 1',
          role: UserRole.OWNER,
          joinedAt: new Date(),
        },
        {
          id: 'member-2',
          userId: 'user-456',
          email: 'user2@example.com',
          name: 'User 2',
          role: UserRole.COLLABORATOR,
          joinedAt: new Date(),
        },
      ];

      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue(mockMembers),
            }),
          }),
        }),
      });

      const result = await projectService.getProjectMembers('project-123');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });

  describe('inviteMember', () => {
    it('should invite member successfully', async () => {
      const mockUser = { id: 'user-456' };
      const mockMember = {
        id: 'member-123',
        projectId: 'project-123',
        userId: 'user-456',
        role: UserRole.COLLABORATOR,
        invitedBy: 'user-123',
        joinedAt: new Date(),
      };

      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      (db.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockMember]),
          }),
        }),
      });

      const result = await projectService.inviteMember(
        'project-123',
        'user2@example.com',
        UserRole.COLLABORATOR,
        'user-123'
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-456');
      expect(result.role).toBe(UserRole.COLLABORATOR);
    });

    it('should throw error when user not found', async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        projectService.inviteMember('project-123', 'nonexistent@example.com', UserRole.COLLABORATOR, 'user-123')
      ).rejects.toThrow('User not found');
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await projectService.updateMemberRole('project-123', 'user-456', UserRole.VIEWER);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Member role updated')
      );
    });
  });

  describe('removeMember', () => {
    it('should remove member from project', async () => {
      (db.delete as jest.Mock).mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      await projectService.removeMember('project-123', 'user-456');

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Member removed')
      );
    });
  });

  describe('getUserRole', () => {
    it('should return user role when member exists', async () => {
      const mockMember = { role: UserRole.COLLABORATOR };

      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockMember]),
          }),
        }),
      });

      const result = await projectService.getUserRole('project-123', 'user-456');

      expect(result).toBe(UserRole.COLLABORATOR);
    });

    it('should return null when member not found', async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await projectService.getUserRole('project-123', 'user-999');

      expect(result).toBeNull();
    });
  });
});
