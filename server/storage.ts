import {
  type User,
  type InsertUser,
  type Post,
  type InsertPost,
  type Comment,
  type InsertComment,
  type Message,
  type InsertMessage,
  type Conversation,
  type InsertConversation,
  type Story,
  type InsertStory,
  type Notification,
  type Follow,
  type InsertFollow,
  type Report,
  type InsertReport,
  type UserProfile,
  type PostWithUser,
  type CommentWithUser,
  type MessageWithSender,
  type ConversationWithDetails,
  type NotificationWithActor,
  type StoryWithUser,
  users,
  posts,
  comments,
  likes,
  follows,
  conversations,
  messages,
  stories,
  notifications,
  reports,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq, and, or, desc, sql, ilike, inArray } from "drizzle-orm";
import ws from "ws";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Configure Neon to use the ws library for WebSocket connections
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Omit<InsertUser, 'password'> & { passwordHash: string }): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getUserProfile(id: string, currentUserId?: string): Promise<UserProfile | undefined>;
  searchUsers(query: string): Promise<User[]>;
  getCloseFriends(userId: string): Promise<User[]>;

  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPost(id: string): Promise<Post | undefined>;
  getPostWithUser(id: string, currentUserId?: string): Promise<PostWithUser | undefined>;
  updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined>;
  deletePost(id: string): Promise<boolean>;
  getFeed(userId: string): Promise<PostWithUser[]>;
  getUserPosts(userId: string, currentUserId?: string): Promise<PostWithUser[]>;
  searchPosts(query: string): Promise<PostWithUser[]>;

  // Like operations
  toggleLike(userId: string, postId: string): Promise<{ liked: boolean; likeCount: number }>;
  isLiked(userId: string, postId: string): Promise<boolean>;

  // Comment operations
  createComment(comment: InsertComment): Promise<Comment>;
  getComments(postId: string): Promise<CommentWithUser[]>;

  // Follow operations
  toggleFollow(followerId: string, followeeId: string): Promise<{ following: boolean }>;
  isFollowing(followerId: string, followeeId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<User[]>;
  getFollowing(userId: string): Promise<User[]>;

  // Message operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversations(userId: string): Promise<ConversationWithDetails[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  getMessages(conversationId: string): Promise<MessageWithSender[]>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;

  // Story operations
  createStory(story: InsertStory): Promise<Story>;
  getActiveStories(userId: string): Promise<StoryWithUser[]>;

  // Notification operations
  createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  getNotifications(userId: string): Promise<NotificationWithActor[]>;
  markNotificationAsRead(id: string): Promise<void>;

  // Report operations
  createReport(report: InsertReport): Promise<Report>;
  getReports(): Promise<Report[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: Omit<InsertUser, 'password'> & { passwordHash: string }): Promise<User> {
    const result = await db.insert(users).values({
      username: insertUser.username,
      email: insertUser.email || null,
      passwordHash: insertUser.passwordHash,
    }).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getUserProfile(id: string, currentUserId?: string): Promise<UserProfile | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const followerCount = await db.select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followeeId, id));

    const followingCount = await db.select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followerId, id));

    let isFollowing = false;
    let isFollowedBy = false;

    if (currentUserId) {
      isFollowing = await this.isFollowing(currentUserId, id);
      isFollowedBy = await this.isFollowing(id, currentUserId);
    }

    return {
      ...user,
      followerCount: Number(followerCount[0].count),
      followingCount: Number(followingCount[0].count),
      isFollowing,
      isFollowedBy,
    };
  }

  async searchUsers(query: string): Promise<User[]> {
    return db.select().from(users)
      .where(or(
        ilike(users.username, `%${query}%`),
        ilike(users.displayName, `%${query}%`)
      ))
      .limit(20);
  }

  async getCloseFriends(userId: string): Promise<User[]> {
    const user = await this.getUser(userId);
    if (!user || !user.closeFriends) return [];

    const closeFriendIds = user.closeFriends as string[];
    if (closeFriendIds.length === 0) return [];

    return db.select().from(users)
      .where(inArray(users.id, closeFriendIds));
  }

  // Post operations
  async createPost(post: InsertPost): Promise<Post> {
    const result = await db.insert(posts).values(post).returning();
    return result[0];
  }

  async getPost(id: string): Promise<Post | undefined> {
    const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    return result[0];
  }

  async getPostWithUser(id: string, currentUserId?: string): Promise<PostWithUser | undefined> {
    const result = await db.select({
      post: posts,
      user: users,
    })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.id, id))
      .limit(1);

    if (!result[0]) return undefined;

    const isLiked = currentUserId ? await this.isLiked(currentUserId, id) : false;
    
    return {
      ...result[0].post,
      user: result[0].user,
      isLiked,
    };
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined> {
    const result = await db.update(posts).set(updates).where(eq(posts.id, id)).returning();
    return result[0];
  }

  async deletePost(id: string): Promise<boolean> {
    const result = await db.delete(posts).where(eq(posts.id, id)).returning();
    return result.length > 0;
  }

  async getFeed(userId: string): Promise<PostWithUser[]> {
    const followingUsers = await db.select({ followeeId: follows.followeeId })
      .from(follows)
      .where(eq(follows.followerId, userId));

    const followeeIds = followingUsers.map(f => f.followeeId);
    followeeIds.push(userId); // Include own posts

    const result = await db.select({
      post: posts,
      user: users,
    })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(and(
        inArray(posts.userId, followeeIds),
        eq(posts.isArchived, false)
      ))
      .orderBy(desc(posts.createdAt))
      .limit(50);

    const postsWithUsers: PostWithUser[] = [];
    for (const row of result) {
      const isLiked = await this.isLiked(userId, row.post.id);
      postsWithUsers.push({
        ...row.post,
        user: row.user,
        isLiked,
      });
    }

    return postsWithUsers;
  }

  async getUserPosts(userId: string, currentUserId?: string): Promise<PostWithUser[]> {
    const result = await db.select({
      post: posts,
      user: users,
    })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(and(
        eq(posts.userId, userId),
        eq(posts.isArchived, false)
      ))
      .orderBy(desc(posts.createdAt));

    const postsWithUsers: PostWithUser[] = [];
    for (const row of result) {
      const isLiked = currentUserId ? await this.isLiked(currentUserId, row.post.id) : false;
      postsWithUsers.push({
        ...row.post,
        user: row.user,
        isLiked,
      });
    }

    return postsWithUsers;
  }

  async searchPosts(query: string): Promise<PostWithUser[]> {
    const result = await db.select({
      post: posts,
      user: users,
    })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(and(
        or(
          ilike(posts.caption, `%${query}%`),
          sql`${posts.hashtags}::text ILIKE ${'%' + query + '%'}`
        ),
        eq(posts.isArchived, false)
      ))
      .orderBy(desc(posts.createdAt))
      .limit(20);

    return result.map(row => ({
      ...row.post,
      user: row.user,
    }));
  }

  // Like operations
  async toggleLike(userId: string, postId: string): Promise<{ liked: boolean; likeCount: number }> {
    const existingLike = await db.select()
      .from(likes)
      .where(and(
        eq(likes.userId, userId),
        eq(likes.postId, postId)
      ))
      .limit(1);

    if (existingLike.length > 0) {
      await db.delete(likes)
        .where(and(
          eq(likes.userId, userId),
          eq(likes.postId, postId)
        ));
      
      await db.update(posts)
        .set({ likeCount: sql`${posts.likeCount} - 1` })
        .where(eq(posts.id, postId));

      const post = await this.getPost(postId);
      return { liked: false, likeCount: post?.likeCount || 0 };
    } else {
      await db.insert(likes).values({ userId, postId });
      
      await db.update(posts)
        .set({ likeCount: sql`${posts.likeCount} + 1` })
        .where(eq(posts.id, postId));

      const post = await this.getPost(postId);
      return { liked: true, likeCount: post?.likeCount || 0 };
    }
  }

  async isLiked(userId: string, postId: string): Promise<boolean> {
    const result = await db.select()
      .from(likes)
      .where(and(
        eq(likes.userId, userId),
        eq(likes.postId, postId)
      ))
      .limit(1);

    return result.length > 0;
  }

  // Comment operations
  async createComment(comment: InsertComment): Promise<Comment> {
    const result = await db.insert(comments).values(comment).returning();
    
    await db.update(posts)
      .set({ commentCount: sql`${posts.commentCount} + 1` })
      .where(eq(posts.id, comment.postId));

    return result[0];
  }

  async getComments(postId: string): Promise<CommentWithUser[]> {
    const result = await db.select({
      comment: comments,
      user: users,
    })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));

    return result.map(row => ({
      ...row.comment,
      user: row.user,
    }));
  }

  // Follow operations
  async toggleFollow(followerId: string, followeeId: string): Promise<{ following: boolean }> {
    const existingFollow = await db.select()
      .from(follows)
      .where(and(
        eq(follows.followerId, followerId),
        eq(follows.followeeId, followeeId)
      ))
      .limit(1);

    if (existingFollow.length > 0) {
      await db.delete(follows)
        .where(and(
          eq(follows.followerId, followerId),
          eq(follows.followeeId, followeeId)
        ));
      return { following: false };
    } else {
      await db.insert(follows).values({ followerId, followeeId });
      return { following: true };
    }
  }

  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const result = await db.select()
      .from(follows)
      .where(and(
        eq(follows.followerId, followerId),
        eq(follows.followeeId, followeeId)
      ))
      .limit(1);

    return result.length > 0;
  }

  async getFollowers(userId: string): Promise<User[]> {
    const result = await db.select({ user: users })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followeeId, userId));

    return result.map(row => row.user);
  }

  async getFollowing(userId: string): Promise<User[]> {
    const result = await db.select({ user: users })
      .from(follows)
      .innerJoin(users, eq(follows.followeeId, users.id))
      .where(eq(follows.followerId, userId));

    return result.map(row => row.user);
  }

  // Message operations
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const result = await db.insert(conversations).values(conversation).returning();
    return result[0];
  }

  async getConversations(userId: string): Promise<ConversationWithDetails[]> {
    const userConversations = await db.select()
      .from(conversations)
      .where(sql`${conversations.participantIds}::jsonb @> ${JSON.stringify([userId])}::jsonb`)
      .orderBy(desc(conversations.lastMessageAt));

    const conversationsWithDetails: ConversationWithDetails[] = [];

    for (const conv of userConversations) {
      const participantIds = conv.participantIds as string[];
      const participantUsers = await db.select()
        .from(users)
        .where(inArray(users.id, participantIds));

      const lastMessageResult = await db.select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      const unreadMessages = await db.select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(
          eq(messages.conversationId, conv.id),
          sql`NOT (${messages.readBy}::jsonb @> ${JSON.stringify([userId])}::jsonb)`
        ));

      conversationsWithDetails.push({
        ...conv,
        participants: participantUsers,
        lastMessage: lastMessageResult[0],
        unreadCount: Number(unreadMessages[0].count),
      });
    }

    return conversationsWithDetails;
  }

  async sendMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    
    await db.update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, message.conversationId));

    return result[0];
  }

  async getMessages(conversationId: string): Promise<MessageWithSender[]> {
    const result = await db.select({
      message: messages,
      sender: users,
    })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    return result.map(row => ({
      ...row.message,
      sender: row.sender,
    }));
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const conversationMessages = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId));

    for (const message of conversationMessages) {
      const readBy = (message.readBy as string[]) || [];
      if (!readBy.includes(userId)) {
        readBy.push(userId);
        await db.update(messages)
          .set({ readBy })
          .where(eq(messages.id, message.id));
      }
    }
  }

  // Story operations
  async createStory(story: InsertStory): Promise<Story> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const result = await db.insert(stories).values({
      ...story,
      expiresAt,
    }).returning();

    return result[0];
  }

  async getActiveStories(userId: string): Promise<StoryWithUser[]> {
    const followingUsers = await db.select({ followeeId: follows.followeeId })
      .from(follows)
      .where(eq(follows.followerId, userId));

    const followeeIds = followingUsers.map(f => f.followeeId);
    followeeIds.push(userId);

    const result = await db.select({
      story: stories,
      user: users,
    })
      .from(stories)
      .innerJoin(users, eq(stories.userId, users.id))
      .where(and(
        inArray(stories.userId, followeeIds),
        sql`${stories.expiresAt} > NOW()`
      ))
      .orderBy(desc(stories.createdAt));

    return result.map(row => ({
      ...row.story,
      user: row.user,
    }));
  }

  // Notification operations
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const result = await db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async getNotifications(userId: string): Promise<NotificationWithActor[]> {
    const result = await db.select({
      notification: notifications,
      actor: users,
    })
      .from(notifications)
      .innerJoin(users, eq(notifications.actorId, users.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return result.map(row => ({
      ...row.notification,
      actor: row.actor,
    }));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
  }

  // Report operations
  async createReport(report: InsertReport): Promise<Report> {
    const result = await db.insert(reports).values(report).returning();
    return result[0];
  }

  async getReports(): Promise<Report[]> {
    return db.select().from(reports).orderBy(desc(reports.createdAt));
  }
}

export const storage = new DatabaseStorage();
