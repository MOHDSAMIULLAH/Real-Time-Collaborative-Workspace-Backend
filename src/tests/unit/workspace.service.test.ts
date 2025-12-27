// Set NODE_ENV before importing any application code
process.env.NODE_ENV = 'test';

import { WorkspaceService } from '../../services/workspace.service';
import { db } from '../../database/postgres';
import { workspaces } from '../../database/schema';

// Mock dependencies
jest.mock('../../database/postgres', () => ({
  db: {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('WorkspaceService', () => {
  let workspaceService: WorkspaceService;

  beforeEach(() => {
    workspaceService = new WorkspaceService();
    jest.clearAllMocks();
  });

  describe('createWorkspace', () => {
    it('should create a workspace successfully', async () => {
      const mockWorkspace = {
        id: 'workspace-123',
        projectId: 'project-123',
        name: 'Test Workspace',
        settings: { theme: 'dark' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = jest.fn().mockResolvedValue([mockWorkspace]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const result = await workspaceService.createWorkspace('project-123', 'Test Workspace', {
        theme: 'dark',
      });

      expect(db.insert).toHaveBeenCalledWith(workspaces);
      expect(mockValues).toHaveBeenCalledWith({
        projectId: 'project-123',
        name: 'Test Workspace',
        settings: { theme: 'dark' },
      });
      expect(result).toEqual({
        id: 'workspace-123',
        projectId: 'project-123',
        name: 'Test Workspace',
        settings: { theme: 'dark' },
        createdAt: mockWorkspace.createdAt,
        updatedAt: mockWorkspace.updatedAt,
      });
    });

    it('should create workspace with default empty settings', async () => {
      const mockWorkspace = {
        id: 'workspace-456',
        projectId: 'project-456',
        name: 'Another Workspace',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = jest.fn().mockResolvedValue([mockWorkspace]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const result = await workspaceService.createWorkspace('project-456', 'Another Workspace');

      expect(mockValues).toHaveBeenCalledWith({
        projectId: 'project-456',
        name: 'Another Workspace',
        settings: {},
      });
      expect(result.settings).toEqual({});
    });
  });

  describe('getWorkspaceById', () => {
    it('should return workspace when found', async () => {
      const mockWorkspace = {
        id: 'workspace-123',
        projectId: 'project-123',
        name: 'Test Workspace',
        settings: { theme: 'light' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockLimit = jest.fn().mockResolvedValue([mockWorkspace]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await workspaceService.getWorkspaceById('workspace-123');

      expect(db.select).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith(workspaces);
      expect(result).toEqual({
        id: 'workspace-123',
        projectId: 'project-123',
        name: 'Test Workspace',
        settings: { theme: 'light' },
        createdAt: mockWorkspace.createdAt,
        updatedAt: mockWorkspace.updatedAt,
      });
    });

    it('should return null when workspace not found', async () => {
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await workspaceService.getWorkspaceById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getProjectWorkspaces', () => {
    it('should return all workspaces for a project', async () => {
      const mockWorkspaces = [
        {
          id: 'workspace-1',
          projectId: 'project-123',
          name: 'Workspace 1',
          settings: { theme: 'dark' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'workspace-2',
          projectId: 'project-123',
          name: 'Workspace 2',
          settings: { theme: 'light' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockOrderBy = jest.fn().mockResolvedValue(mockWorkspaces);
      const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await workspaceService.getProjectWorkspaces('project-123');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Workspace 1');
      expect(result[1].name).toBe('Workspace 2');
    });

    it('should return empty array when no workspaces found', async () => {
      const mockOrderBy = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await workspaceService.getProjectWorkspaces('project-456');

      expect(result).toEqual([]);
    });
  });

  describe('updateWorkspace', () => {
    it('should update workspace name and settings', async () => {
      const mockUpdated = {
        id: 'workspace-123',
        projectId: 'project-123',
        name: 'Updated Workspace',
        settings: { theme: 'dark', autoSave: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = jest.fn().mockResolvedValue([mockUpdated]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (db.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await workspaceService.updateWorkspace('workspace-123', {
        name: 'Updated Workspace',
        settings: { theme: 'dark', autoSave: true },
      });

      expect(db.update).toHaveBeenCalledWith(workspaces);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Workspace',
          settings: { theme: 'dark', autoSave: true },
          updatedAt: expect.any(Date),
        })
      );
      expect(result.name).toBe('Updated Workspace');
    });

    it('should update only provided fields', async () => {
      const mockUpdated = {
        id: 'workspace-123',
        projectId: 'project-123',
        name: 'Partially Updated',
        settings: { theme: 'dark' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = jest.fn().mockResolvedValue([mockUpdated]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (db.update as jest.Mock).mockReturnValue({ set: mockSet });

      await workspaceService.updateWorkspace('workspace-123', {
        name: 'Partially Updated',
      });

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Partially Updated',
          updatedAt: expect.any(Date),
        })
      );
      expect(mockSet).toHaveBeenCalledWith(
        expect.not.objectContaining({
          settings: expect.anything(),
        })
      );
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete workspace successfully', async () => {
      const mockWhere = jest.fn().mockResolvedValue(undefined);
      (db.delete as jest.Mock).mockReturnValue({ where: mockWhere });

      await workspaceService.deleteWorkspace('workspace-123');

      expect(db.delete).toHaveBeenCalledWith(workspaces);
      expect(mockWhere).toHaveBeenCalled();
    });
  });
});
