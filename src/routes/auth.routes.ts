import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/schemas';
import rateLimit from 'express-rate-limit';
import { config } from '../config';

const router = Router();

// Rate limiting for auth routes (disabled in test environment)
const authLimiter = config.env === 'test' 
  ? (req: any, res: any, next: any) => next() // Pass through in test
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 requests per window
      message: 'Too many authentication attempts, please try again later',
    });

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or email already exists
 */
router.post('/register', authLimiter, validate(registerSchema), authController.register.bind(authController));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, validate(loginSchema), authController.login.bind(authController));

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken.bind(authController));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authController.logout.bind(authController));

export default router;
