import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { insertUserSchema, insertPostSchema, insertCommentSchema, insertMessageSchema, insertConversationSchema, insertStorySchema, insertReportSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Authentication middleware
interface AuthRequest extends Request {
  userId?: string;
}

async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket, req) => {
    const token = new URL(req.url || '', `http://${req.headers.host}`).searchParams.get('token');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        clients.set(decoded.userId, ws);

        ws.on('close', () => {
          clients.delete(decoded.userId);
        });
      } catch (error) {
        ws.close();
      }
    }
  });

  // Helper function to send WebSocket messages
  function sendToUser(userId: string, data: any) {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  // ==================== AUTH ROUTES ====================

  // Register
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      const user = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        passwordHash: hashedPassword,
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      res.json({ token, userId: user.id });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      res.json({ token, userId: user.id });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ==================== USER ROUTES ====================

  // Get current user
  app.get('/api/users/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const profile = await storage.getUserProfile(req.userId!);
      if (!profile) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update current user
  app.patch('/api/users/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const updates = req.body;
      const updatedUser = await storage.updateUser(req.userId!, updates);
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      const profile = await storage.getUserProfile(updatedUser.id);
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get user profile
  app.get('/api/users/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const profile = await storage.getUserProfile(req.params.id, req.userId);
      if (!profile) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Toggle follow
  app.post('/api/users/:id/follow', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { following } = await storage.toggleFollow(req.userId!, req.params.id);
      
      if (following) {
        await storage.createNotification({
          userId: req.params.id,
          actorId: req.userId!,
          type: 'follow',
          targetId: null,
          read: false,
        });

        sendToUser(req.params.id, {
          type: 'notification',
          data: { type: 'follow', actorId: req.userId }
        });
      }

      res.json({ following });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ==================== POST ROUTES ====================

  // Create post
  app.post('/api/posts', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = insertPostSchema.parse({
        ...req.body,
        userId: req.userId,
      });
      
      const post = await storage.createPost(validatedData);
      const postWithUser = await storage.getPostWithUser(post.id, req.userId);
      res.json(postWithUser);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get feed
  app.get('/api/posts/feed', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const posts = await storage.getFeed(req.userId!);
      res.json(posts);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get user posts
  app.get('/api/posts/user/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const posts = await storage.getUserPosts(req.params.userId, req.userId);
      res.json(posts);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get post
  app.get('/api/posts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const post = await storage.getPostWithUser(req.params.id, req.userId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.json(post);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update post
  app.patch('/api/posts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      if (post.userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const updatedPost = await storage.updatePost(req.params.id, req.body);
      const postWithUser = await storage.getPostWithUser(updatedPost!.id, req.userId);
      res.json(postWithUser);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete post
  app.delete('/api/posts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      if (post.userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await storage.deletePost(req.params.id);
      res.json({ message: 'Post deleted' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Like post
  app.post('/api/posts/:id/like', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const result = await storage.toggleLike(req.userId!, req.params.id);
      
      if (result.liked && post.userId !== req.userId) {
        await storage.createNotification({
          userId: post.userId,
          actorId: req.userId!,
          type: 'like',
          targetId: req.params.id,
          read: false,
        });

        sendToUser(post.userId, {
          type: 'notification',
          data: { type: 'like', actorId: req.userId, postId: req.params.id }
        });
      }

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Add comment
  app.post('/api/posts/:id/comment', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const validatedData = insertCommentSchema.parse({
        ...req.body,
        postId: req.params.id,
        userId: req.userId,
      });

      const comment = await storage.createComment(validatedData);
      
      if (post.userId !== req.userId) {
        await storage.createNotification({
          userId: post.userId,
          actorId: req.userId!,
          type: 'comment',
          targetId: req.params.id,
          read: false,
        });

        sendToUser(post.userId, {
          type: 'notification',
          data: { type: 'comment', actorId: req.userId, postId: req.params.id }
        });
      }

      const user = await storage.getUser(req.userId!);
      res.json({ ...comment, user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get comments
  app.get('/api/posts/:id/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const comments = await storage.getComments(req.params.id);
      res.json(comments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ==================== MESSAGE ROUTES ====================

  // Create conversation
  app.post('/api/conversations', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = insertConversationSchema.parse({
        ...req.body,
        participantIds: [...new Set([req.userId!, ...(req.body.participantIds || [])])],
      });

      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get conversations
  app.get('/api/conversations', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const conversations = await storage.getConversations(req.userId!);
      res.json(conversations);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Send message
  app.post('/api/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.userId,
      });

      const message = await storage.sendMessage(validatedData);
      const sender = await storage.getUser(req.userId!);

      // Notify other participants via WebSocket
      const conversation = await storage.getConversations(req.userId!);
      const conv = conversation.find(c => c.id === validatedData.conversationId);
      if (conv) {
        const participantIds = Array.from(conv.participantIds);
        participantIds.forEach(participantId => {
          if (participantId !== req.userId) {
            sendToUser(participantId, {
              type: 'message',
              data: { ...message, sender }
            });
          }
        });
      }

      res.json({ ...message, sender });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get messages
  app.get('/api/messages/:conversationId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const messages = await storage.getMessages(req.params.conversationId);
      await storage.markMessagesAsRead(req.params.conversationId, req.userId!);
      res.json(messages);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ==================== STORY ROUTES ====================

  // Create story
  app.post('/api/stories', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = insertStorySchema.parse({
        ...req.body,
        userId: req.userId,
      });

      const story = await storage.createStory(validatedData);
      const user = await storage.getUser(req.userId!);
      res.json({ ...story, user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get active stories
  app.get('/api/stories', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const stories = await storage.getActiveStories(req.userId!);
      res.json(stories);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ==================== NOTIFICATION ROUTES ====================

  // Get notifications
  app.get('/api/notifications', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const notifications = await storage.getNotifications(req.userId!);
      res.json(notifications);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Mark notification as read
  app.post('/api/notifications/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ message: 'Notification marked as read' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ==================== SEARCH ROUTES ====================

  // Search users
  app.get('/api/search/users', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }
      const users = await storage.searchUsers(query);
      res.json(users);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Search posts
  app.get('/api/search/posts', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }
      const posts = await storage.searchPosts(query);
      res.json(posts);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ==================== REPORT ROUTES ====================

  // Create report
  app.post('/api/reports', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = insertReportSchema.parse({
        ...req.body,
        reporterId: req.userId,
      });

      const report = await storage.createReport(validatedData);
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get reports (admin only - simplified for MVP)
  app.get('/api/reports', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const reports = await storage.getReports();
      res.json(reports);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return httpServer;
}
