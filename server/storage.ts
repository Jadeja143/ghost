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
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Omit<InsertUser, 'password'> & { passwordHash: string }): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getUserProfile(id: string, currentUserId?: string): Promise<UserProfile | undefined>;
  searchUsers(query: string): Promise<User[]>;

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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private posts: Map<string, Post>;
  private comments: Map<string, Comment>;
  private likes: Map<string, { userId: string; postId: string; createdAt: Date }>;
  private follows: Map<string, Follow>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private stories: Map<string, Story>;
  private notifications: Map<string, Notification>;
  private reports: Map<string, Report>;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.comments = new Map();
    this.likes = new Map();
    this.follows = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.stories = new Map();
    this.notifications = new Map();
    this.reports = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async createUser(insertUser: Omit<InsertUser, 'password'> & { passwordHash: string }): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      username: insertUser.username,
      email: insertUser.email || null,
      passwordHash: insertUser.passwordHash,
      displayName: null,
      bio: null,
      avatarUrl: null,
      verified: false,
      joinedAt: new Date(),
      isActive: true,
      isPrivate: false,
      lastSeen: null,
      isOnline: false,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUserProfile(id: string, currentUserId?: string): Promise<UserProfile | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const followerCount = Array.from(this.follows.values()).filter(
      (f) => f.followeeId === id && f.approved
    ).length;
    const followingCount = Array.from(this.follows.values()).filter(
      (f) => f.followerId === id && f.approved
    ).length;

    let isFollowing = false;
    let isFollowedBy = false;

    if (currentUserId) {
      isFollowing = await this.isFollowing(currentUserId, id);
      isFollowedBy = await this.isFollowing(id, currentUserId);
    }

    return {
      ...user,
      followerCount,
      followingCount,
      isFollowing,
      isFollowedBy,
    };
  }

  async searchUsers(query: string): Promise<User[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.users.values())
      .filter((user) =>
        user.username.toLowerCase().includes(lowerQuery) ||
        user.displayName?.toLowerCase().includes(lowerQuery) ||
        user.bio?.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 20);
  }

  // Post operations
  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = randomUUID();
    const post: Post = {
      ...insertPost,
      id,
      caption: insertPost.caption || null,
      hashtags: insertPost.hashtags || [],
      createdAt: new Date(),
      updatedAt: null,
      privacy: insertPost.privacy || 'public',
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
      isArchived: false,
      allowComments: true,
      mediaUrl: insertPost.mediaUrl || null,
      mediaType: insertPost.mediaType || null,
    };
    this.posts.set(id, post);
    return post;
  }

  async getPost(id: string): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async getPostWithUser(id: string, currentUserId?: string): Promise<PostWithUser | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;

    const user = this.users.get(post.userId);
    if (!user) return undefined;

    const isLiked = currentUserId ? await this.isLiked(currentUserId, id) : false;
    const comments = await this.getComments(id);

    return {
      ...post,
      user,
      isLiked,
      comments,
    };
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;
    const updatedPost = { ...post, ...updates, updatedAt: new Date() };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async deletePost(id: string): Promise<boolean> {
    const post = this.posts.get(id);
    if (!post) return false;
    post.isArchived = true;
    this.posts.set(id, post);
    return true;
  }

  async getFeed(userId: string): Promise<PostWithUser[]> {
    const following = Array.from(this.follows.values())
      .filter((f) => f.followerId === userId && f.approved)
      .map((f) => f.followeeId);

    const feedUserIds = [...following, userId];

    const posts = Array.from(this.posts.values())
      .filter((p) => feedUserIds.includes(p.userId) && !p.isArchived)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20);

    const postsWithUser: PostWithUser[] = [];
    for (const post of posts) {
      const user = this.users.get(post.userId);
      if (user) {
        const isLiked = await this.isLiked(userId, post.id);
        postsWithUser.push({ ...post, user, isLiked });
      }
    }

    return postsWithUser;
  }

  async getUserPosts(userId: string, currentUserId?: string): Promise<PostWithUser[]> {
    const posts = Array.from(this.posts.values())
      .filter((p) => p.userId === userId && !p.isArchived)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const user = this.users.get(userId);
    if (!user) return [];

    const postsWithUser: PostWithUser[] = [];
    for (const post of posts) {
      const isLiked = currentUserId ? await this.isLiked(currentUserId, post.id) : false;
      postsWithUser.push({ ...post, user, isLiked });
    }

    return postsWithUser;
  }

  async searchPosts(query: string): Promise<PostWithUser[]> {
    const lowerQuery = query.toLowerCase();
    const posts = Array.from(this.posts.values())
      .filter((post) => {
        const caption = post.caption?.toLowerCase() || '';
        const hashtags = post.hashtags?.join(' ').toLowerCase() || '';
        return caption.includes(lowerQuery) || hashtags.includes(lowerQuery);
      })
      .slice(0, 20);

    const postsWithUser: PostWithUser[] = [];
    for (const post of posts) {
      const user = this.users.get(post.userId);
      if (user) {
        postsWithUser.push({ ...post, user });
      }
    }

    return postsWithUser;
  }

  // Like operations
  async toggleLike(userId: string, postId: string): Promise<{ liked: boolean; likeCount: number }> {
    const key = `${userId}-${postId}`;
    const existing = this.likes.get(key);
    const post = this.posts.get(postId);
    
    if (!post) throw new Error('Post not found');

    const currentLikeCount = post.likeCount || 0;

    if (existing) {
      this.likes.delete(key);
      post.likeCount = Math.max(0, currentLikeCount - 1);
      this.posts.set(postId, post);
      return { liked: false, likeCount: post.likeCount };
    } else {
      this.likes.set(key, { userId, postId, createdAt: new Date() });
      post.likeCount = currentLikeCount + 1;
      this.posts.set(postId, post);
      return { liked: true, likeCount: post.likeCount };
    }
  }

  async isLiked(userId: string, postId: string): Promise<boolean> {
    const key = `${userId}-${postId}`;
    return this.likes.has(key);
  }

  // Comment operations
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = randomUUID();
    const comment: Comment = {
      ...insertComment,
      id,
      parentCommentId: insertComment.parentCommentId || null,
      createdAt: new Date(),
      editedAt: null,
    };
    this.comments.set(id, comment);

    const post = this.posts.get(insertComment.postId);
    if (post) {
      post.commentCount = (post.commentCount || 0) + 1;
      this.posts.set(insertComment.postId, post);
    }

    return comment;
  }

  async getComments(postId: string): Promise<CommentWithUser[]> {
    const comments = Array.from(this.comments.values())
      .filter((c) => c.postId === postId)
      .sort((a, b) => {
        const aTime = a.createdAt ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt ? b.createdAt.getTime() : 0;
        return aTime - bTime;
      });

    const commentsWithUser: CommentWithUser[] = [];
    for (const comment of comments) {
      const user = this.users.get(comment.userId);
      if (user) {
        commentsWithUser.push({ ...comment, user });
      }
    }

    return commentsWithUser;
  }

  // Follow operations
  async toggleFollow(followerId: string, followeeId: string): Promise<{ following: boolean }> {
    const key = `${followerId}-${followeeId}`;
    const existing = Array.from(this.follows.values()).find(
      (f) => f.followerId === followerId && f.followeeId === followeeId
    );

    if (existing) {
      this.follows.delete(key);
      return { following: false };
    } else {
      this.follows.set(key, {
        followerId,
        followeeId,
        createdAt: new Date(),
        approved: true,
      });
      return { following: true };
    }
  }

  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    return Array.from(this.follows.values()).some(
      (f) => f.followerId === followerId && f.followeeId === followeeId && f.approved
    );
  }

  async getFollowers(userId: string): Promise<User[]> {
    const followerIds = Array.from(this.follows.values())
      .filter((f) => f.followeeId === userId && f.approved)
      .map((f) => f.followerId);

    return followerIds.map((id) => this.users.get(id)).filter((u): u is User => !!u);
  }

  async getFollowing(userId: string): Promise<User[]> {
    const followingIds = Array.from(this.follows.values())
      .filter((f) => f.followerId === userId && f.approved)
      .map((f) => f.followeeId);

    return followingIds.map((id) => this.users.get(id)).filter((u): u is User => !!u);
  }

  // Message operations
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      isGroup: insertConversation.isGroup || false,
      title: insertConversation.title || null,
      createdAt: new Date(),
      lastMessageAt: null,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getConversations(userId: string): Promise<ConversationWithDetails[]> {
    const userConversations = Array.from(this.conversations.values())
      .filter((c) => c.participantIds.includes(userId))
      .sort((a, b) => {
        const aTime = a.lastMessageAt ? a.lastMessageAt.getTime() : 0;
        const bTime = b.lastMessageAt ? b.lastMessageAt.getTime() : 0;
        return bTime - aTime;
      });

    const conversationsWithDetails: ConversationWithDetails[] = [];
    for (const conversation of userConversations) {
      const participants = conversation.participantIds
        .map((id) => this.users.get(id))
        .filter((u): u is User => !!u);

      const messages = Array.from(this.messages.values())
        .filter((m) => m.conversationId === conversation.id)
        .sort((a, b) => {
          const aTime = a.createdAt ? a.createdAt.getTime() : 0;
          const bTime = b.createdAt ? b.createdAt.getTime() : 0;
          return bTime - aTime;
        });

      const lastMessage = messages[0] || undefined;
      const unreadCount = messages.filter(
        (m) => !(m.readBy || []).includes(userId)
      ).length;

      conversationsWithDetails.push({
        ...conversation,
        participants,
        lastMessage,
        unreadCount,
      });
    }

    return conversationsWithDetails;
  }

  async sendMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
      readBy: [insertMessage.senderId],
    };
    this.messages.set(id, message);

    const conversation = this.conversations.get(insertMessage.conversationId);
    if (conversation) {
      conversation.lastMessageAt = new Date();
      this.conversations.set(insertMessage.conversationId, conversation);
    }

    return message;
  }

  async getMessages(conversationId: string): Promise<MessageWithSender[]> {
    const messages = Array.from(this.messages.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => {
        const aTime = a.createdAt ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt ? b.createdAt.getTime() : 0;
        return aTime - bTime;
      });

    const messagesWithSender: MessageWithSender[] = [];
    for (const message of messages) {
      const sender = this.users.get(message.senderId);
      if (sender) {
        messagesWithSender.push({ ...message, sender });
      }
    }

    return messagesWithSender;
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const messages = Array.from(this.messages.values()).filter(
      (m) => m.conversationId === conversationId && !(m.readBy || []).includes(userId)
    );

    for (const message of messages) {
      const readBy = message.readBy || [];
      if (!readBy.includes(userId)) {
        readBy.push(userId);
        message.readBy = readBy;
        this.messages.set(message.id, message);
      }
    }
  }

  // Story operations
  async createStory(insertStory: InsertStory): Promise<Story> {
    const id = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const story: Story = {
      ...insertStory,
      id,
      createdAt: now,
      expiresAt,
    };
    this.stories.set(id, story);
    return story;
  }

  async getActiveStories(userId: string): Promise<StoryWithUser[]> {
    const now = new Date();
    const following = Array.from(this.follows.values())
      .filter((f) => f.followerId === userId && f.approved)
      .map((f) => f.followeeId);

    const storyUserIds = [...following, userId];

    const stories = Array.from(this.stories.values())
      .filter((s) => storyUserIds.includes(s.userId) && s.expiresAt > now)
      .sort((a, b) => {
        const aTime = a.createdAt ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      });

    const storiesWithUser: StoryWithUser[] = [];
    for (const story of stories) {
      const user = this.users.get(story.userId);
      if (user) {
        storiesWithUser.push({ ...story, user });
      }
    }

    return storiesWithUser;
  }

  // Notification operations
  async createNotification(
    notification: Omit<Notification, 'id' | 'createdAt'>
  ): Promise<Notification> {
    const id = randomUUID();
    const newNotification: Notification = {
      ...notification,
      id,
      targetId: notification.targetId || null,
      createdAt: new Date(),
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async getNotifications(userId: string): Promise<NotificationWithActor[]> {
    const notifications = Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => {
        const aTime = a.createdAt ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 20);

    const notificationsWithActor: NotificationWithActor[] = [];
    for (const notification of notifications) {
      const actor = this.users.get(notification.actorId);
      if (actor) {
        notificationsWithActor.push({ ...notification, actor });
      }
    }

    return notificationsWithActor;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.read = true;
      this.notifications.set(id, notification);
    }
  }

  // Report operations
  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = randomUUID();
    const report: Report = {
      ...insertReport,
      id,
      createdAt: new Date(),
      status: 'pending',
    };
    this.reports.set(id, report);
    return report;
  }

  async getReports(): Promise<Report[]> {
    return Array.from(this.reports.values()).sort((a, b) => {
      const aTime = a.createdAt ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    });
  }
}

export const storage = new MemStorage();
