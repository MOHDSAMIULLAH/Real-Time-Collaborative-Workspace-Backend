export enum UserRole {
  OWNER = 'owner',
  COLLABORATOR = 'collaborator',
  VIEWER = 'viewer',
}

export enum ProjectStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export enum JobType {
  EXPORT = 'export',
  IMPORT = 'import',
  BACKUP = 'backup',
  SYNC = 'sync',
}

export enum EventType {
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  FILE_CHANGED = 'file_changed',
  CURSOR_MOVED = 'cursor_moved',
  ACTIVITY_UPDATE = 'activity_update',
}
