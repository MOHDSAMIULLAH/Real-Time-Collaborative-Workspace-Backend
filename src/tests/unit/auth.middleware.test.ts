// Set NODE_ENV before importing any application code
process.env.NODE_ENV = 'test';

import { Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth.middleware';
import { authService } from '../../services/auth.service';
import { userService } from '../../services/user.service';

jest.mock('../../services/auth.service');
jest.mock('../../services/user.service');
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (authService.verifyAccessToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
      });
      (userService.findById as jest.Mock).mockResolvedValue(mockUser);

      await authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(authService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(userService.findById).toHaveBeenCalledWith('user-123');
      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as AuthRequest).user).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        role: undefined,
      });
    });

    it('should reject request without authorization header', async () => {
      await authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat',
      };

      await authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (authService.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject when user not found', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (authService.verifyAccessToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
      });
      (userService.findById as jest.Mock).mockResolvedValue(null);

      await authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not found' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should allow authorized user with correct role', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'owner',
      };

      const middleware = authorize('owner', 'collaborator');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject user without correct role', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'viewer',
      };

      const middleware = authorize('owner', 'collaborator');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden: Insufficient permissions',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      const middleware = authorize('owner');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow user when no roles specified', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      const middleware = authorize();
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
