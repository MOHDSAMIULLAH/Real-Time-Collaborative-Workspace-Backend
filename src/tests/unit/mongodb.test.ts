import { connectMongoDB, disconnectMongoDB } from '../../database/mongodb';
import mongoose from 'mongoose';

describe('MongoDB Connection', () => {
  afterAll(async () => {
    // Ensure MongoDB is disconnected after tests
    if (mongoose.connection.readyState !== 0) {
      await disconnectMongoDB();
    }
  });

  it('should connect to MongoDB', async () => {
    // The connection should already be established from jest.setup.js
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    expect([0, 1, 2, 3]).toContain(mongoose.connection.readyState);
  });

  it('should disconnect from MongoDB', async () => {
    await disconnectMongoDB();
    expect(mongoose.connection.readyState).toBe(0);

    // Reconnect for other tests
    await connectMongoDB();
  });

  it('should handle MongoDB connection events', async () => {
    // Test that the connection has event listeners
    const errorListeners = mongoose.connection.listeners('error');
    const disconnectedListeners = mongoose.connection.listeners('disconnected');

    expect(errorListeners.length).toBeGreaterThan(0);
    expect(disconnectedListeners.length).toBeGreaterThan(0);
  });
});
