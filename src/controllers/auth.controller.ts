import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import logger from '../utils/logger';

export class AuthController {
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name } = req.body;

      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }

      const user = await userService.createUser(email, password, name);
      const tokens = await authService.generateTokens({
        userId: user.id,
        email: user.email,
      });

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        tokens,
      });
    } catch (error) {
      logger.error('Registration error', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      const user = await userService.findByEmail(email);
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const isValidPassword = await authService.comparePassword(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const tokens = await authService.generateTokens({
        userId: user.id,
        email: user.email,
      });

      logger.info(`User logged in: ${user.id}`);

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        tokens,
      });
    } catch (error) {
      logger.error('Login error', error);
      res.status(500).json({ error: 'Login failed' });
    }
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token required' });
        return;
      }

      const payload = authService.verifyRefreshToken(refreshToken);
      const isValid = await authService.validateRefreshToken(payload.userId, refreshToken);

      if (!isValid) {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      const tokens = await authService.generateTokens({
        userId: payload.userId,
        email: payload.email,
      });

      res.json({
        message: 'Token refreshed successfully',
        tokens,
      });
    } catch (error) {
      logger.error('Token refresh error', error);
      res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        const payload = authService.verifyRefreshToken(refreshToken);
        await authService.revokeRefreshToken(payload.userId);
      }

      res.json({ message: 'Logout successful' });
    } catch (error) {
      logger.error('Logout error', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  };
}

export const authController = new AuthController();
