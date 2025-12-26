import mongoose from 'mongoose';
import { config } from '../config';
import logger from '../utils/logger';

export const connectMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.database.mongodb.uri);
    logger.info('MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
  } catch (error) {
    logger.error('MongoDB connection failed', error);
    throw error;
  }
};

export const disconnectMongoDB = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
};
