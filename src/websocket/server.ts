import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { authService } from '../services/auth.service';
import { projectService } from '../services/project.service';
import { redisClient } from '../database/redis';
import { ActivityLog } from '../models/ActivityLog';
import { Session } from '../models/Session';
import { EventType } from '../types/enums';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface WebSocketClient extends WebSocket {
  userId?: string;
  projectId?: string;
  sessionId?: string;
  isAlive?: boolean;
}

interface CollaborationEvent {
  type: EventType;
  projectId: string;
  userId: string;
  payload: any;
  timestamp: Date;
}

export class WebSocketServer {
  private wss: WebSocket.Server;
  private clients: Map<string, Set<WebSocketClient>>;

  constructor(port: number) {
    this.wss = new WebSocket.Server({ port });
    this.clients = new Map();

    this.setupServer();
    this.setupHeartbeat();
    this.setupRedisSubscription();
  }

  private setupServer(): void {
    this.wss.on('connection', async (ws: WebSocketClient, req: IncomingMessage) => {
      try {
        // Extract token from query params
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        const projectId = url.searchParams.get('projectId');

        if (!token || !projectId) {
          ws.close(1008, 'Missing token or projectId');
          return;
        }

        // Verify token
        const payload = authService.verifyAccessToken(token);
        const userId = payload.userId;

        // Verify user has access to project
        const role = await projectService.getUserRole(projectId, userId);
        if (!role) {
          ws.close(1008, 'Access denied');
          return;
        }

        // Setup client
        ws.userId = userId;
        ws.projectId = projectId;
        ws.sessionId = uuidv4();
        ws.isAlive = true;

        // Add to clients map
        if (!this.clients.has(projectId)) {
          this.clients.set(projectId, new Set());
        }
        this.clients.get(projectId)!.add(ws);

        // Create session in MongoDB
        await Session.create({
          userId,
          projectId,
          sessionId: ws.sessionId,
          isActive: true,
          lastActivity: new Date(),
        });

        // Notify others about user joining
        await this.broadcastEvent({
          type: EventType.USER_JOINED,
          projectId,
          userId,
          payload: { sessionId: ws.sessionId },
          timestamp: new Date(),
        });

        logger.info(`WebSocket client connected: ${userId} to project ${projectId}`);

        // Handle messages
        ws.on('message', async (message: string) => {
          try {
            const data = JSON.parse(message.toString());
            await this.handleMessage(ws, data);
          } catch (error) {
            logger.error('Error handling WebSocket message', error);
            ws.send(JSON.stringify({ error: 'Invalid message format' }));
          }
        });

        // Handle pong
        ws.on('pong', () => {
          ws.isAlive = true;
        });

        // Handle disconnect
        ws.on('close', async () => {
          await this.handleDisconnect(ws);
        });

        // Send welcome message
        ws.send(
          JSON.stringify({
            type: 'connected',
            sessionId: ws.sessionId,
            projectId,
          })
        );
      } catch (error) {
        logger.error('Error in WebSocket connection', error);
        ws.close(1011, 'Internal server error');
      }
    });

    logger.info(`WebSocket server started on port ${this.wss.options.port}`);
  }

  private async handleMessage(ws: WebSocketClient, data: any): Promise<void> {
    const { type, payload } = data;

    if (!ws.userId || !ws.projectId) {
      return;
    }

    // Update session activity
    await Session.updateOne(
      { sessionId: ws.sessionId },
      { lastActivity: new Date() }
    );

    const event: CollaborationEvent = {
      type,
      projectId: ws.projectId,
      userId: ws.userId,
      payload,
      timestamp: new Date(),
    };

    // Log activity to MongoDB
    await ActivityLog.create({
      projectId: event.projectId,
      userId: event.userId,
      eventType: event.type,
      payload: event.payload,
      timestamp: event.timestamp,
    });

    // Broadcast to other clients via Redis
    await this.broadcastEvent(event);
  }

  private async handleDisconnect(ws: WebSocketClient): Promise<void> {
    if (ws.projectId && ws.userId) {
      // Remove from clients map
      const projectClients = this.clients.get(ws.projectId);
      if (projectClients) {
        projectClients.delete(ws);
        if (projectClients.size === 0) {
          this.clients.delete(ws.projectId);
        }
      }

      // Update session
      await Session.updateOne(
        { sessionId: ws.sessionId },
        { isActive: false }
      );

      // Notify others about user leaving
      await this.broadcastEvent({
        type: EventType.USER_LEFT,
        projectId: ws.projectId,
        userId: ws.userId,
        payload: { sessionId: ws.sessionId },
        timestamp: new Date(),
      });

      logger.info(`WebSocket client disconnected: ${ws.userId} from project ${ws.projectId}`);
    }
  }

  private async broadcastEvent(event: CollaborationEvent): Promise<void> {
    const channel = `collaboration:${event.projectId}`;
    const message = JSON.stringify(event);

    // Publish to Redis for horizontal scaling
    await redisClient.publish(channel, message);

    // Also broadcast locally
    this.broadcastToProject(event.projectId, event);
  }

  private broadcastToProject(projectId: string, event: CollaborationEvent): void {
    const projectClients = this.clients.get(projectId);
    if (!projectClients) {
      return;
    }

    const message = JSON.stringify(event);

    projectClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        // Don't send back to sender for certain events
        if (client.userId !== event.userId || event.type === EventType.USER_JOINED || event.type === EventType.USER_LEFT) {
          client.send(message);
        }
      }
    });
  }

  private setupHeartbeat(): void {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocket) => {
        const client = ws as WebSocketClient;
        
        if (client.isAlive === false) {
          return client.terminate();
        }

        client.isAlive = false;
        client.ping();
      });
    }, 30000); // 30 seconds

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  private setupRedisSubscription(): void {
    // Subscribe to all collaboration channels
    // This allows multiple WebSocket servers to share events
    redisClient.subscriber.psubscribe('collaboration:*');
    
    redisClient.subscriber.on('pmessage', (pattern, channel, message) => {
      try {
        const event: CollaborationEvent = JSON.parse(message);
        const projectId = channel.split(':')[1];
        
        // Broadcast to local clients
        this.broadcastToProject(projectId, event);
      } catch (error) {
        logger.error('Error handling Redis message', error);
      }
    });

    logger.info('Redis subscription for collaboration events established');
  }

  public close(): void {
    this.wss.close();
    logger.info('WebSocket server closed');
  }
}
