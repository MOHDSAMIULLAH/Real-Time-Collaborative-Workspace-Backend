import { db } from '../database/postgres';
import { users } from '../database/schema';
import { eq } from 'drizzle-orm';
import { IUser } from '../types/interfaces';
import { authService } from './auth.service';
import logger from '../utils/logger';

export class UserService {
  async createUser(email: string, password: string, name: string): Promise<IUser> {
    try {
      const hashedPassword = await authService.hashPassword(password);
      
      const [user] = await db.insert(users).values({
        email,
        password: hashedPassword,
        name,
      }).returning();
      
      logger.info(`User created: ${user.id}`);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        password: hashedPassword,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Email already exists');
      }
      logger.error('Error creating user', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findById(id: string): Promise<IUser | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateUser(id: string, updates: Partial<IUser>): Promise<IUser> {
    const updateData: any = {};

    if (updates.name) {
      updateData.name = updates.name;
    }

    if (updates.email) {
      updateData.email = updates.email;
    }

    updateData.updatedAt = new Date();

    const [user] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    return {
      id: user.id,
      email: user.email,
      password: '',
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const userService = new UserService();
