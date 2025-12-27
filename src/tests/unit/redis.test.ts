import { redisClient } from '../../database/redis';

describe('Redis Connection', () => {
  describe('set and get', () => {
    it('should set and get a value', async () => {
      await redisClient.set('test-key', 'test-value');
      const value = await redisClient.get('test-key');

      expect(value).toBe('test-value');
    });

    it('should set a value with expiry', async () => {
      await redisClient.set('test-key-expiry', 'test-value', 10);
      const value = await redisClient.get('test-key-expiry');

      expect(value).toBe('test-value');
    });

    it('should return null for non-existent key', async () => {
      const value = await redisClient.get('non-existent-key');

      expect(value).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a key', async () => {
      await redisClient.set('test-key-delete', 'test-value');
      await redisClient.del('test-key-delete');

      const value = await redisClient.get('test-key-delete');
      expect(value).toBeNull();
    });
  });

  describe('pub/sub', () => {
    it('should publish and subscribe to a channel', async () => {
      const channel = 'test-channel';
      const message = 'test-message';

      const receivedMessages: string[] = [];

      await redisClient.subscribe(channel, (msg) => {
        receivedMessages.push(msg);
      });

      // Wait for subscription to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      await redisClient.publish(channel, message);

      // Wait for message to be received
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedMessages).toContain(message);
    });

    it('should handle multiple subscribers', async () => {
      const channel = 'test-channel-2';
      const message = 'test-message-2';

      const receivedMessages1: string[] = [];
      const receivedMessages2: string[] = [];

      await redisClient.subscribe(channel, (msg) => {
        receivedMessages1.push(msg);
      });

      await redisClient.subscribe(channel, (msg) => {
        receivedMessages2.push(msg);
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await redisClient.publish(channel, message);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedMessages1.length + receivedMessages2.length).toBeGreaterThan(0);
    });
  });
});
