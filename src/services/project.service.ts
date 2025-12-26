import { db, postgresDB } from '../database/postgres';
import { projects, projectMembers, users } from '../database/schema';
import { eq, and, ne } from 'drizzle-orm';
import { IProject, IProjectMember } from '../types/interfaces';
import { UserRole, ProjectStatus } from '../types/enums';
import logger from '../utils/logger';

export class ProjectService {
  async createProject(name: string, description: string, ownerId: string): Promise<IProject> {
    const client = await postgresDB.getClient();
    
    try {
      await client.query('BEGIN');

      // Create project using Drizzle
      const [project] = await db.insert(projects).values({
        name,
        description,
        ownerId,
        status: ProjectStatus.ACTIVE,
      }).returning();

      // Add owner as project member
      await db.insert(projectMembers).values({
        projectId: project.id,
        userId: ownerId,
        role: UserRole.OWNER,
        invitedBy: ownerId,
      });

      await client.query('COMMIT');

      logger.info(`Project created: ${project.id} by user: ${ownerId}`);

      return {
        id: project.id,
        name: project.name,
        description: project.description || '',
        ownerId: project.ownerId,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating project', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getProjectById(projectId: string): Promise<IProject | null> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

    if (!project) {
      return null;
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description || '',
      ownerId: project.ownerId,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async getUserProjects(userId: string): Promise<IProject[]> {
    const results = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        ownerId: projects.ownerId,
        status: projects.status,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .where(and(
        eq(projectMembers.userId, userId),
        ne(projects.status, ProjectStatus.DELETED)
      ))
      .orderBy(projects.createdAt);

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      ownerId: row.ownerId,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async updateProject(
    projectId: string,
    updates: Partial<IProject>
  ): Promise<IProject> {
    const updateData: any = {};

    if (updates.name) {
      updateData.name = updates.name;
    }

    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }

    if (updates.status) {
      updateData.status = updates.status;
    }

    updateData.updatedAt = new Date();

    const [project] = await db.update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning();

    logger.info(`Project updated: ${projectId}`);

    return {
      id: project.id,
      name: project.name,
      description: project.description || '',
      ownerId: project.ownerId,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async deleteProject(projectId: string): Promise<void> {
    await db.update(projects)
      .set({ 
        status: ProjectStatus.DELETED, 
        updatedAt: new Date() 
      })
      .where(eq(projects.id, projectId));
    
    logger.info(`Project deleted: ${projectId}`);
  }

  async getProjectMembers(projectId: string): Promise<any[]> {
    const results = await db
      .select({
        id: projectMembers.id,
        userId: projectMembers.userId,
        email: users.email,
        name: users.name,
        role: projectMembers.role,
        joinedAt: projectMembers.joinedAt,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(projectMembers.joinedAt);

    return results;
  }

  async inviteMember(
    projectId: string,
    userEmail: string,
    role: UserRole,
    invitedBy: string
  ): Promise<IProjectMember> {
    // Find user by email
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, userEmail)).limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    const userId = user.id;

    const [member] = await db.insert(projectMembers)
      .values({
        projectId,
        userId,
        role,
        invitedBy,
      })
      .onConflictDoUpdate({
        target: [projectMembers.projectId, projectMembers.userId],
        set: { role },
      })
      .returning();

    logger.info(`Member invited to project ${projectId}: ${userId}`);

    return {
      id: member.id,
      projectId: member.projectId,
      userId: member.userId,
      role: member.role as UserRole,
      invitedBy: member.invitedBy,
      joinedAt: member.joinedAt,
    };
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    role: UserRole
  ): Promise<void> {
    await db.update(projectMembers)
      .set({ role })
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      ));
    
    logger.info(`Member role updated in project ${projectId}: ${userId} -> ${role}`);
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    await db.delete(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      ));
    
    logger.info(`Member removed from project ${projectId}: ${userId}`);
  }

  async getUserRole(projectId: string, userId: string): Promise<UserRole | null> {
    const [member] = await db
      .select({ role: projectMembers.role })
      .from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      ))
      .limit(1);

    if (!member) {
      return null;
    }

    return member.role as UserRole;
  }
}

export const projectService = new ProjectService();
