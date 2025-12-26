import { db } from '../database/postgres';
import { workspaces } from '../database/schema';
import { eq } from 'drizzle-orm';
import { IWorkspace } from '../types/interfaces';
import logger from '../utils/logger';

export class WorkspaceService {
  async createWorkspace(
    projectId: string,
    name: string,
    settings: Record<string, any> = {}
  ): Promise<IWorkspace> {
    const [workspace] = await db.insert(workspaces).values({
      projectId,
      name,
      settings,
    }).returning();

    logger.info(`Workspace created: ${workspace.id} for project: ${projectId}`);

    return {
      id: workspace.id,
      projectId: workspace.projectId,
      name: workspace.name,
      settings: workspace.settings as Record<string, any>,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }

  async getWorkspaceById(workspaceId: string): Promise<IWorkspace | null> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);

    if (!workspace) {
      return null;
    }

    return {
      id: workspace.id,
      projectId: workspace.projectId,
      name: workspace.name,
      settings: workspace.settings as Record<string, any>,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }

  async getProjectWorkspaces(projectId: string): Promise<IWorkspace[]> {
    const results = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.projectId, projectId))
      .orderBy(workspaces.createdAt);

    return results.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      settings: row.settings as Record<string, any>,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async updateWorkspace(
    workspaceId: string,
    updates: Partial<IWorkspace>
  ): Promise<IWorkspace> {
    const updateData: any = {};

    if (updates.name) {
      updateData.name = updates.name;
    }

    if (updates.settings) {
      updateData.settings = updates.settings;
    }

    updateData.updatedAt = new Date();

    const [workspace] = await db.update(workspaces)
      .set(updateData)
      .where(eq(workspaces.id, workspaceId))
      .returning();

    logger.info(`Workspace updated: ${workspaceId}`);

    return {
      id: workspace.id,
      projectId: workspace.projectId,
      name: workspace.name,
      settings: workspace.settings as Record<string, any>,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    logger.info(`Workspace deleted: ${workspaceId}`);
  }
}

export const workspaceService = new WorkspaceService();
