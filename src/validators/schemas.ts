import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const createProjectSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'archived', 'deleted']).optional(),
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(3).max(100),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'collaborator', 'viewer']),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'collaborator', 'viewer']),
});

export const createJobSchema = z.object({
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
});
