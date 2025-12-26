import Bull, { Queue, Job } from 'bull';
import { config } from '../config';
import logger from '../utils/logger';
import { postgresDB } from '../database/postgres';
import { JobStatus } from '../types/enums';
import { v4 as uuidv4 } from 'uuid';

export interface JobData {
  id: string;
  type: string;
  payload: any;
}

export class JobQueue {
  private queue: Queue;

  constructor() {
    // Configure Redis for Bull queue with TLS support for Upstash
    let redisConfig: any;
    
    if (config.bull.redis.url) {
      // Parse URL to check if it uses TLS (rediss://)
      const useTLS = config.bull.redis.url.startsWith('rediss://');
      
      redisConfig = {
        redis: config.bull.redis.url,
        ...(useTLS && {
          tls: {
            rejectUnauthorized: false, // Required for Upstash
          },
        }),
      };
    } else {
      redisConfig = {
        redis: {
          host: config.bull.redis.host,
          port: config.bull.redis.port,
          password: config.bull.redis.password,
        },
      };
    }

    this.queue = new Bull('job-processing', {
      ...redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.queue.on('error', (error) => {
      logger.error('Queue error', error);
    });

    this.queue.on('failed', async (job, error) => {
      logger.error(`Job ${job.id} failed`, { error: error.message });
      await this.updateJobStatus(job.data.id, JobStatus.FAILED, null, error.message);
    });

    this.queue.on('completed', async (job, result) => {
      logger.info(`Job ${job.id} completed`);
      await this.updateJobStatus(job.data.id, JobStatus.COMPLETED, result);
    });

    logger.info('Job queue initialized');
  }

  async addJob(type: string, payload: any): Promise<string> {
    const jobId = uuidv4();

    // Store in database
    const query = `
      INSERT INTO jobs (id, type, payload, status, retry_count, max_retries)
      VALUES ($1, $2, $3, $4, 0, 3)
      RETURNING id
    `;
    await postgresDB.query(query, [jobId, type, JSON.stringify(payload), JobStatus.PENDING]);

    // Add to Bull queue
    const jobData: JobData = { id: jobId, type, payload };
    await this.queue.add(jobData, {
      jobId,
    });

    logger.info(`Job added to queue: ${jobId}`);
    return jobId;
  }

  async getJobStatus(jobId: string): Promise<any> {
    const query = 'SELECT * FROM jobs WHERE id = $1';
    const result = await postgresDB.query(query, [jobId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async getJobsByStatus(status: JobStatus): Promise<any[]> {
    const query = 'SELECT * FROM jobs WHERE status = $1 ORDER BY created_at DESC';
    const result = await postgresDB.query(query, [status]);
    return result.rows;
  }

  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    result?: any,
    error?: string
  ): Promise<void> {
    const fields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [status];
    let paramCounter = 2;

    if (result !== undefined) {
      fields.push(`result = $${paramCounter++}`);
      values.push(JSON.stringify(result));
    }

    if (error) {
      fields.push(`error = $${paramCounter++}`);
      values.push(error);
    }

    if (status === JobStatus.RETRYING) {
      fields.push(`retry_count = retry_count + 1`);
    }

    values.push(jobId);

    const query = `
      UPDATE jobs
      SET ${fields.join(', ')}
      WHERE id = $${paramCounter}
    `;

    await postgresDB.query(query, values);
  }

  async processJob(job: Job<JobData>): Promise<any> {
    const { id, type, payload } = job.data;

    logger.info(`Processing job: ${id} of type: ${type}`);

    // Update status to processing
    await this.updateJobStatus(id, JobStatus.PROCESSING);

    try {
      let result;

      // Process different job types
      switch (type) {
        case 'code_execution':
          result = await this.processCodeExecution(payload);
          break;
        case 'data_processing':
          result = await this.processDataProcessing(payload);
          break;
        case 'report_generation':
          result = await this.processReportGeneration(payload);
          break;
        case 'notification':
          result = await this.processNotification(payload);
          break;
        default:
          throw new Error(`Unknown job type: ${type}`);
      }

      return result;
    } catch (error: any) {
      if (job.attemptsMade < job.opts.attempts!) {
        await this.updateJobStatus(id, JobStatus.RETRYING);
      }
      throw error;
    }
  }

  private async processCodeExecution(payload: any): Promise<any> {
    // Simulate code execution
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const { code, language } = payload;

    logger.info('Executing code', { language });

    // Mock execution result
    return {
      success: true,
      output: `Executed ${language} code successfully`,
      executionTime: 125,
      memoryUsed: 1024,
    };
  }

  private async processDataProcessing(payload: any): Promise<any> {
    // Simulate data processing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const { dataSource, operation } = payload;

    logger.info('Processing data', { dataSource, operation });

    return {
      success: true,
      recordsProcessed: 1000,
      processingTime: 1500,
    };
  }

  private async processReportGeneration(payload: any): Promise<any> {
    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const { reportType, dateRange } = payload;

    logger.info('Generating report', { reportType, dateRange });

    return {
      success: true,
      reportUrl: `https://example.com/reports/${uuidv4()}.pdf`,
      generatedAt: new Date().toISOString(),
    };
  }

  private async processNotification(payload: any): Promise<any> {
    // Simulate notification sending
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { recipient, message } = payload;

    logger.info('Sending notification', { recipient });

    return {
      success: true,
      sent: true,
      sentAt: new Date().toISOString(),
    };
  }

  getQueue(): Queue {
    return this.queue;
  }

  async close(): Promise<void> {
    await this.queue.close();
    logger.info('Job queue closed');
  }
}

export const jobQueue = new JobQueue();
