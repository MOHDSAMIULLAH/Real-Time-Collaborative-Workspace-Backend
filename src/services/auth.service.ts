import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { IJwtPayload, IAuthTokens } from '../types/interfaces';
import { redisClient } from '../database/redis';
import logger from '../utils/logger';

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  generateAccessToken(payload: IJwtPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
  }

  generateRefreshToken(payload: IJwtPayload): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as jwt.SignOptions);
  }

  verifyAccessToken(token: string): IJwtPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as IJwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  verifyRefreshToken(token: string): IJwtPayload {
    try {
      return jwt.verify(token, config.jwt.refreshSecret) as IJwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async generateTokens(payload: IJwtPayload): Promise<IAuthTokens> {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Store refresh token in Redis
    const refreshTokenKey = `refresh_token:${payload.userId}`;
    await redisClient.set(refreshTokenKey, refreshToken, 7 * 24 * 60 * 60); // 7 days

    return { accessToken, refreshToken };
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    const refreshTokenKey = `refresh_token:${userId}`;
    await redisClient.del(refreshTokenKey);
    logger.info(`Refresh token revoked for user: ${userId}`);
  }

  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const refreshTokenKey = `refresh_token:${userId}`;
    const storedToken = await redisClient.get(refreshTokenKey);
    return storedToken === token;
  }
}

export const authService = new AuthService();
