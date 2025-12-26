import { jobQueue } from '../queue/job-queue';
import logger from '../utils/logger';

// Worker process to handle jobs
async function startWorker() {
  logger.info('Starting job worker...');

  const queue = jobQueue.getQueue();

  queue.process(async (job) => {
    return await jobQueue.processJob(job);
  });

  logger.info('Job worker started and ready to process jobs');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing worker...');
    await queue.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, closing worker...');
    await queue.close();
    process.exit(0);
  });
}

// Start the worker if this file is run directly
if (require.main === module) {
  startWorker().catch((error) => {
    logger.error('Worker startup failed', error);
    process.exit(1);
  });
}

export { startWorker };
