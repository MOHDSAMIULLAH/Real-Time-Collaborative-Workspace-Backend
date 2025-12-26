import { UserRole } from './enums';

export interface IUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProject {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkspace {
  id: string;
  projectId: string;
  name: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: UserRole;
  invitedBy: string;
  joinedAt: Date;
}

export interface IJob {
  id: string;
  type: string;
  payload: any;
  status: string;
  result?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJwtPayload {
  userId: string;
  email: string;
  role?: UserRole;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}
