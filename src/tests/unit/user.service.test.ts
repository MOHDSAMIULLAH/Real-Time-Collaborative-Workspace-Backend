// Set NODE_ENV before importing any application code
process.env.NODE_ENV = 'test';

import { UserService } from '../../services/user.service';
import { db } from '../../database/postgres';
import { users } from '../../database/schema';
import { authService } from '../../services/auth.service';

// Mock dependencies
jest.mock('../../database/postgres', () => ({
  db: {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../services/auth.service', () => ({
  authService: {
    hashPassword: jest.fn(),
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

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const mockHashedPassword = 'hashed_password_123';
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: mockHashedPassword,
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (authService.hashPassword as jest.Mock).mockResolvedValue(mockHashedPassword);
      
      const mockReturning = jest.fn().mockResolvedValue([mockUser]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const result = await userService.createUser('test@example.com', 'password123', 'Test User');

      expect(authService.hashPassword).toHaveBeenCalledWith('password123');
      expect(db.insert).toHaveBeenCalledWith(users);
      expect(mockValues).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: mockHashedPassword,
        name: 'Test User',
      });
      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: mockHashedPassword,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw error for duplicate email', async () => {
      const mockHashedPassword = 'hashed_password_123';
      (authService.hashPassword as jest.Mock).mockResolvedValue(mockHashedPassword);
      
      const duplicateError: any = new Error('Duplicate key');
      duplicateError.code = '23505';
      
      const mockReturning = jest.fn().mockRejectedValue(duplicateError);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as jest.Mock).mockReturnValue({ values: mockValues });

      await expect(
        userService.createUser('duplicate@example.com', 'password123', 'Test User')
      ).rejects.toThrow('Email already exists');
    });

    it('should throw error for other database errors', async () => {
      const mockHashedPassword = 'hashed_password_123';
      (authService.hashPassword as jest.Mock).mockResolvedValue(mockHashedPassword);
      
      const dbError = new Error('Database connection failed');
      
      const mockReturning = jest.fn().mockRejectedValue(dbError);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as jest.Mock).mockReturnValue({ values: mockValues });

      await expect(
        userService.createUser('test@example.com', 'password123', 'Test User')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockLimit = jest.fn().mockResolvedValue([mockUser]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await userService.findByEmail('test@example.com');

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should return null when user not found', async () => {
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await userService.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'user@example.com',
        password: 'hashed_password',
        name: 'User Name',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockLimit = jest.fn().mockResolvedValue([mockUser]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await userService.findById('user-456');

      expect(result).toEqual({
        id: 'user-456',
        email: 'user@example.com',
        password: 'hashed_password',
        name: 'User Name',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should return null when user not found by id', async () => {
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await userService.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user name and email', async () => {
      const mockUpdatedUser = {
        id: 'user-123',
        email: 'updated@example.com',
        password: 'hashed_password',
        name: 'Updated Name',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = jest.fn().mockResolvedValue([mockUpdatedUser]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (db.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await userService.updateUser('user-123', {
        name: 'Updated Name',
        email: 'updated@example.com',
      });

      expect(db.update).toHaveBeenCalledWith(users);
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Name',
        email: 'updated@example.com',
        updatedAt: expect.any(Date),
      }));
      expect(result.name).toBe('Updated Name');
      expect(result.email).toBe('updated@example.com');
      expect(result.password).toBe(''); // Password should be empty in response
    });

    it('should update only name', async () => {
      const mockUpdatedUser = {
        id: 'user-123',
        email: 'user@example.com',
        password: 'hashed_password',
        name: 'New Name Only',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = jest.fn().mockResolvedValue([mockUpdatedUser]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (db.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await userService.updateUser('user-123', {
        name: 'New Name Only',
      });

      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Name Only',
        updatedAt: expect.any(Date),
      }));
      expect(result.name).toBe('New Name Only');
    });
  });
});
