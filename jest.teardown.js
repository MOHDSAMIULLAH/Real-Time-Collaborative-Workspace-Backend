// Global teardown for Jest - ensures all connections are closed after all tests
module.exports = async () => {
  console.log('\nJest teardown: Cleaning up connections...');
  
  try {
    // Close all singleton connections that might be hanging
    const { redisClient } = require('./src/database/redis');
    const { jobQueue } = require('./src/queue/job-queue');
    
    // Close job queue (which has its own Bull Redis connections)
    if (jobQueue && typeof jobQueue.close === 'function') {
      await jobQueue.close();
    }
    
    // Close Redis connections
    if (redisClient && typeof redisClient.close === 'function') {
      await redisClient.close();
    }
    
    // Give a moment for connections to fully close
    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch (error) {
    console.log('Jest teardown: Error during cleanup (expected in some environments)');
  }
  
  console.log('Jest teardown: Complete');
};
