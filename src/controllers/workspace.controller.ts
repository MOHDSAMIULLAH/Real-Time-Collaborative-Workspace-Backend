import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { workspaceService } from '../services/workspace.service';
import { projectService } from '../services/project.service';
import { UserRole } from '../types/enums';
import logger from '../utils/logger';

export class WorkspaceController {
  createWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { name, settings } = req.body;
      const userId = req.user!.userId;

      // Check if user has access
      const role = await projectService.getUserRole(projectId, userId);
      if (!role || (role !== UserRole.OWNER && role !== UserRole.COLLABORATOR)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const workspace = await workspaceService.createWorkspace(projectId, name, settings);

      res.status(201).json({
        message: 'Workspace created successfully',
        workspace,
      });
    } catch (error) {
      logger.error('Error creating workspace', error);
      res.status(500).json({ error: 'Failed to create workspace' });
    }
  };

  getWorkspaces = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.userId;

      // Check if user has access
      const role = await projectService.getUserRole(projectId, userId);
      if (!role) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const workspaces = await workspaceService.getProjectWorkspaces(projectId);

      res.json({ workspaces });
    } catch (error) {
      logger.error('Error fetching workspaces', error);
      res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
  };

  getWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user!.userId;

      const workspace = await workspaceService.getWorkspaceById(workspaceId);
      if (!workspace) {
        res.status(404).json({ error: 'Workspace not found' });
        return;
      }

      // Check if user has access to the project
      const role = await projectService.getUserRole(workspace.projectId, userId);
      if (!role) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json({ workspace });
    } catch (error) {
      logger.error('Error fetching workspace', error);
      res.status(500).json({ error: 'Failed to fetch workspace' });
    }
  };

  updateWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const updates = req.body;
      const userId = req.user!.userId;

      const workspace = await workspaceService.getWorkspaceById(workspaceId);
      if (!workspace) {
        res.status(404).json({ error: 'Workspace not found' });
        return;
      }

      // Check if user has access
      const role = await projectService.getUserRole(workspace.projectId, userId);
      if (!role || (role !== UserRole.OWNER && role !== UserRole.COLLABORATOR)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const updatedWorkspace = await workspaceService.updateWorkspace(workspaceId, updates);

      res.json({
        message: 'Workspace updated successfully',
        workspace: updatedWorkspace,
      });
    } catch (error) {
      logger.error('Error updating workspace', error);
      res.status(500).json({ error: 'Failed to update workspace' });
    }
  };

  deleteWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user!.userId;

      const workspace = await workspaceService.getWorkspaceById(workspaceId);
      if (!workspace) {
        res.status(404).json({ error: 'Workspace not found' });
        return;
      }

      // Check if user is owner or collaborator
      const role = await projectService.getUserRole(workspace.projectId, userId);
      if (!role || (role !== UserRole.OWNER && role !== UserRole.COLLABORATOR)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      await workspaceService.deleteWorkspace(workspaceId);

      res.json({ message: 'Workspace deleted successfully' });
    } catch (error) {
      logger.error('Error deleting workspace', error);
      res.status(500).json({ error: 'Failed to delete workspace' });
    }
  };
}

export const workspaceController = new WorkspaceController();
