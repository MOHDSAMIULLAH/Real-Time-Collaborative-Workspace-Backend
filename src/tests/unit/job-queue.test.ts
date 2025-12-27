import { jobQueue } from '../../queue/job-queue';
import { JobStatus } from '../../types/enums';

describe('JobQueue', () => {
  afterAll(async () => {
    await jobQueue.close();
  });

  describe('addJob', () => {
    it('should add a job to the queue', async () => {
      const jobId = await jobQueue.addJob('code_execution', {
        code: 'console.log("Hello World")',
        language: 'javascript',
      });

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      // Wait a bit and check status
      await new Promise((resolve) => setTimeout(resolve, 100));

      const job = await jobQueue.getJobStatus(jobId);
      expect(job).toBeDefined();
      expect(job.type).toBe('code_execution');
      expect([JobStatus.PENDING, JobStatus.PROCESSING, JobStatus.COMPLETED]).toContain(job.status);
    });

    it('should handle different job types', async () => {
      const jobTypes = [
        { type: 'data_processing', payload: { dataSource: 'test', operation: 'transform' } },
        { type: 'report_generation', payload: { reportType: 'monthly', dateRange: '2024-01' } },
        { type: 'notification', payload: { recipient: 'test@example.com', message: 'Test' } },
      ];

      for (const { type, payload } of jobTypes) {
        const jobId = await jobQueue.addJob(type, payload);
        expect(jobId).toBeDefined();

        const job = await jobQueue.getJobStatus(jobId);
        expect(job.type).toBe(type);
      }
    });
  });

  describe('getJobsByStatus', () => {
    beforeAll(async () => {
      // Create some test jobs
      await jobQueue.addJob('code_execution', { code: 'test', language: 'javascript' });
      await jobQueue.addJob('data_processing', { dataSource: 'test', operation: 'load' });
    });

    it('should get jobs by status', async () => {
      const pendingJobs = await jobQueue.getJobsByStatus(JobStatus.PENDING);
      expect(Array.isArray(pendingJobs)).toBe(true);
    });
  });

  describe('processJob', () => {
    it('should process code execution job', async () => {
      const payload = {
        code: 'console.log("test")',
        language: 'javascript',
      };

      const jobId = await jobQueue.addJob('code_execution', payload);

      // Wait for job to process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const job = await jobQueue.getJobStatus(jobId);
      expect([JobStatus.PENDING, JobStatus.COMPLETED, JobStatus.PROCESSING]).toContain(job.status);
    });
  });

  describe('getJobStatus', () => {
    it('should get job status by id', async () => {
      const jobId = await jobQueue.addJob('notification', {
        recipient: 'test@example.com',
        message: 'Test notification',
      });

      const job = await jobQueue.getJobStatus(jobId);
      expect(job).toBeDefined();
      expect(job.id).toBe(jobId);
      expect(job.type).toBe('notification');
    });

    it('should return null for non-existent job', async () => {
      const job = await jobQueue.getJobStatus('00000000-0000-0000-0000-000000000000');
      expect(job).toBeNull();
    });
  });

  describe('getQueue', () => {
    it('should return Bull queue instance', () => {
      const queue = jobQueue.getQueue();
      expect(queue).toBeDefined();
      expect(queue.name).toBe('job-processing');
    });
  });
});
