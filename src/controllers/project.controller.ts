import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { projectService } from '../services/project.service';
import { UserRole } from '../types/enums';
import logger from '../utils/logger';

export class ProjectController {
  async createProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;
      const userId = req.user!.userId;

      const project = await projectService.createProject(name, description, userId);

      res.status(201).json({
        message: 'Project created successfully',
        project,
      });
    } catch (error) {
      logger.error('Error creating project', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  async getProjects(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projects = await projectService.getUserProjects(userId);

      res.json({ projects });
    } catch (error) {
      logger.error('Error fetching projects', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }

  async getProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user!.userId;

      const project = await projectService.getProjectById(projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Check if user has access
      const role = await projectService.getUserRole(projectId, userId);
      if (!role) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json({ project });
    } catch (error) {
      logger.error('Error fetching project', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  }

  async updateProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user!.userId;
      const updates = req.body;

      // Check if user is owner or collaborator
      const role = await projectService.getUserRole(projectId, userId);
      if (!role || (role !== UserRole.OWNER && role !== UserRole.COLLABORATOR)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const project = await projectService.updateProject(projectId, updates);

      res.json({
        message: 'Project updated successfully',
        project,
      });
    } catch (error) {
      logger.error('Error updating project', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }

  async deleteProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user!.userId;

      // Check if user is owner
      const role = await projectService.getUserRole(projectId, userId);
      if (role !== UserRole.OWNER) {
        res.status(403).json({ error: 'Only project owner can delete the project' });
        return;
      }

      await projectService.deleteProject(projectId);

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      logger.error('Error deleting project', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }

  async getMembers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user!.userId;

      // Check if user has access
      const role = await projectService.getUserRole(projectId, userId);
      if (!role) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const members = await projectService.getProjectMembers(projectId);

      res.json({ members });
    } catch (error) {
      logger.error('Error fetching members', error);
      res.status(500).json({ error: 'Failed to fetch members' });
    }
  }

  async inviteMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { email, role } = req.body;
      const userId = req.user!.userId;

      // Check if user is owner or collaborator
      const userRole = await projectService.getUserRole(projectId, userId);
      if (!userRole || (userRole !== UserRole.OWNER && userRole !== UserRole.COLLABORATOR)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const member = await projectService.inviteMember(projectId, email, role, userId);

      res.status(201).json({
        message: 'Member invited successfully',
        member,
      });
    } catch (error: any) {
      logger.error('Error inviting member', error);
      if (error.message === 'User not found') {
        res.status(404).json({ error: 'User not found' });
      } else {
        res.status(500).json({ error: 'Failed to invite member' });
      }
    }
  }

  async updateMemberRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId, memberId } = req.params;
      const { role } = req.body;
      const userId = req.user!.userId;

      // Check if user is owner
      const userRole = await projectService.getUserRole(projectId, userId);
      if (userRole !== UserRole.OWNER) {
        res.status(403).json({ error: 'Only project owner can update roles' });
        return;
      }

      await projectService.updateMemberRole(projectId, memberId, role);

      res.json({ message: 'Member role updated successfully' });
    } catch (error) {
      logger.error('Error updating member role', error);
      res.status(500).json({ error: 'Failed to update member role' });
    }
  }

  async removeMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId, memberId } = req.params;
      const userId = req.user!.userId;

      // Check if user is owner
      const userRole = await projectService.getUserRole(projectId, userId);
      if (userRole !== UserRole.OWNER) {
        res.status(403).json({ error: 'Only project owner can remove members' });
        return;
      }

      await projectService.removeMember(projectId, memberId);

      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      logger.error('Error removing member', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  }
}

export const projectController = new ProjectController();
