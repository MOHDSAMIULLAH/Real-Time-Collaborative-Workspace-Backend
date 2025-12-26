import { authService } from '../../services/auth.service';

describe('AuthService', () => {
  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'testPassword123';
      const hashed = await authService.hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(0);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'testPassword123';
      const hashed = await authService.hashPassword(password);
      const isMatch = await authService.comparePassword(password, hashed);
      
      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const hashed = await authService.hashPassword(password);
      const isMatch = await authService.comparePassword(wrongPassword, hashed);
      
      expect(isMatch).toBe(false);
    });
  });

  describe('generateAccessToken', () => {
    it('should generate valid access token', () => {
      const payload = {
        userId: '123',
        email: 'test@example.com',
      };
      
      const token = authService.generateAccessToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const payload = {
        userId: '123',
        email: 'test@example.com',
      };
      
      const token = authService.generateAccessToken(payload);
      const decoded = authService.verifyAccessToken(token);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => authService.verifyAccessToken(invalidToken)).toThrow();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate valid refresh token', () => {
      const payload = {
        userId: '123',
        email: 'test@example.com',
      };
      
      const token = authService.generateRefreshToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const payload = {
        userId: '123',
        email: 'test@example.com',
      };
      
      const token = authService.generateRefreshToken(payload);
      const decoded = authService.verifyRefreshToken(token);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });
  });
});
