import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).max(100).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const createProjectSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
});

export const updateProjectSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(500).optional(),
  status: Joi.string().valid('active', 'archived', 'deleted').optional(),
});

export const createWorkspaceSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  settings: Joi.object().optional(),
});

export const inviteMemberSchema = Joi.object({
  email: Joi.string().email().required(),
  role: Joi.string().valid('owner', 'collaborator', 'viewer').required(),
});

export const updateMemberRoleSchema = Joi.object({
  role: Joi.string().valid('owner', 'collaborator', 'viewer').required(),
});

export const createJobSchema = Joi.object({
  type: Joi.string().required(),
  payload: Joi.object().required(),
});
