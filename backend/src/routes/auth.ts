import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { database } from '../database/connection';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { redisClient } from '../services/redis';

const router = express.Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  role: z.enum(['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'FOREMAN', 'WORKER', 'CLIENT', 'VIEWER']),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  companyType: z.enum(['GENERAL_CONTRACTOR', 'SUBCONTRACTOR', 'DEVELOPER', 'ARCHITECT', 'ENGINEER', 'OTHER']),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

// Helper function to generate tokens
const generateTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { userId },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    config.JWT_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
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
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  // Find user by email
  const user = await database.client.user.findUnique({
    where: { email },
    include: {
      company: true,
    },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid email or password',
    });
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid email or password',
    });
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id);

  // Store refresh token in Redis
  await redisClient.set(
    `refresh_token:${user.id}`,
    refreshToken,
    7 * 24 * 60 * 60 // 7 days
  );

  // Update last login
  await database.client.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  logger.info('User logged in', { userId: user.id, email: user.email });

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
      company: user.company,
    },
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: config.JWT_EXPIRES_IN,
    },
  });
}));

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: User registration
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - role
 *               - companyName
 *               - companyType
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [OWNER, ADMIN, PROJECT_MANAGER, FOREMAN, WORKER, CLIENT, VIEWER]
 *               companyName:
 *                 type: string
 *               companyType:
 *                 type: string
 *                 enum: [GENERAL_CONTRACTOR, SUBCONTRACTOR, DEVELOPER, ARCHITECT, ENGINEER, OTHER]
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         description: Validation error or user already exists
 */
router.post('/register', asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  // Check if user already exists
  const existingUser = await database.client.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    return res.status(400).json({
      error: 'Registration failed',
      message: 'User with this email already exists',
    });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 12);

  // Create company and user in transaction
  const result = await database.transaction(async (prisma) => {
    // Create company
    const company = await prisma.company.create({
      data: {
        name: data.companyName,
        type: data.companyType,
        settings: {
          timezone: 'America/New_York',
          currency: 'USD',
          dateFormat: 'MM/dd/yyyy',
        },
      },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: hashedPassword,
        phone: data.phone,
        role: data.role,
        companyId: company.id,
        permissions: [], // Will be set based on role
        isActive: true,
      },
      include: {
        company: true,
      },
    });

    return { user, company };
  });

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(result.user.id);

  // Store refresh token in Redis
  await redisClient.set(
    `refresh_token:${result.user.id}`,
    refreshToken,
    7 * 24 * 60 * 60 // 7 days
  );

  logger.info('User registered', {
    userId: result.user.id,
    email: result.user.email,
    companyId: result.company.id,
  });

  res.status(201).json({
    message: 'Registration successful',
    user: {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      role: result.user.role,
      companyId: result.user.companyId,
      company: result.company,
    },
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: config.JWT_EXPIRES_IN,
    },
  });
}));

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
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
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = refreshTokenSchema.parse(req.body);

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.JWT_SECRET) as any;

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Not a refresh token',
      });
    }

    // Check if refresh token exists in Redis
    const storedToken = await redisClient.get(`refresh_token:${decoded.userId}`);
    if (!storedToken || storedToken !== refreshToken) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Refresh token not found or expired',
      });
    }

    // Check if user still exists and is active
    const user = await database.client.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found or inactive',
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user.id);

    // Update refresh token in Redis
    await redisClient.set(
      `refresh_token:${user.id}`,
      tokens.refreshToken,
      7 * 24 * 60 * 60 // 7 days
    );

    logger.info('Token refreshed', { userId: user.id });

    res.json({
      message: 'Token refreshed successfully',
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: config.JWT_EXPIRES_IN,
      },
    });

  } catch (error) {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Refresh token is invalid or expired',
    });
  }
}));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      
      // Remove refresh token from Redis
      await redisClient.del(`refresh_token:${decoded.userId}`);
      
      logger.info('User logged out', { userId: decoded.userId });
    } catch (error) {
      // Token might be invalid/expired, but we still want to return success
      logger.warn('Logout with invalid token');
    }
  }

  res.json({
    message: 'Logout successful',
  });
}));

export default router;