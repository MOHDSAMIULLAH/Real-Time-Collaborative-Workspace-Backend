import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { jobQueue } from '../queue/job-queue';
import logger from '../utils/logger';

export class JobController {
  async createJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type, payload } = req.body;

      const jobId = await jobQueue.addJob(type, payload);

      res.status(201).json({
        message: 'Job created successfully',
        jobId,
      });
    } catch (error) {
      logger.error('Error creating job', error);
      res.status(500).json({ error: 'Failed to create job' });
    }
  }

  async getJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      const job = await jobQueue.getJobStatus(jobId);

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      res.json({
        id: job.id,
        type: job.type,
        status: job.status,
        payload: job.payload,
        result: job.result,
        error: job.error,
        retryCount: job.retry_count,
        maxRetries: job.max_retries,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      });
    } catch (error) {
      logger.error('Error fetching job', error);
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  }

  async getJobs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.query;

      let jobs;
      if (status) {
        jobs = await jobQueue.getJobsByStatus(status as any);
      } else {
        // Get all jobs (you might want to add pagination here)
        const query = 'SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100';
        const { postgresDB } = await import('../database/postgres');
        const result = await postgresDB.query(query);
        jobs = result.rows;
      }

      res.json({ jobs });
    } catch (error) {
      logger.error('Error fetching jobs', error);
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  }
}

export const jobController = new JobController();
