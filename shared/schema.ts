import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, integer, jsonb, bigint, uuid as pgUuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 30 }).notNull().unique(),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 100 }),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  verified: boolean("verified").default(false),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
  isActive: boolean("is_active").default(true),
  isPrivate: boolean("is_private").default(false),
  lastSeen: timestamp("last_seen", { withTimezone: true }),
  isOnline: boolean("is_online").default(false),
  closeFriends: jsonb("close_friends").$type<string[]>().default(sql`'[]'::jsonb`),
  blockedUsers: jsonb("blocked_users").$type<string[]>().default(sql`'[]'::jsonb`),
});

// Posts table
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  caption: text("caption"),
  hashtags: jsonb("hashtags").$type<string[]>().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  privacy: varchar("privacy", { length: 20 }).default("public"),
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  viewCount: bigint("view_count", { mode: "number" }).default(0),
  isArchived: boolean("is_archived").default(false),
  allowComments: boolean("allow_comments").default(true),
  mediaUrl: text("media_url"),
  mediaType: varchar("media_type", { length: 20 }),
});

// Likes table
export const likes = pgTable("likes", {
  userId: varchar("user_id").notNull(),
  postId: varchar("post_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Comments table
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  userId: varchar("user_id").notNull(),
  parentCommentId: varchar("parent_comment_id"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  editedAt: timestamp("edited_at", { withTimezone: true }),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  isGroup: boolean("is_group").default(false),
  title: varchar("title", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  participantIds: jsonb("participant_ids").$type<string[]>().notNull(),
  isMuted: boolean("is_muted").default(false),
  mutedUntil: timestamp("muted_until", { withTimezone: true }),
  readReceiptEnabled: boolean("read_receipt_enabled").default(true),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  readBy: jsonb("read_by").$type<string[]>().default(sql`'[]'::jsonb`),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  actorId: varchar("actor_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  targetId: varchar("target_id"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Stories table (Enhanced with Instagram-like features)
export const stories = pgTable("stories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  mediaUrl: text("media_url").notNull(),
  mediaType: varchar("media_type", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  // Multi-media story grouping (for multiple uploads in one session)
  groupId: varchar("group_id"),
  sequenceNumber: integer("sequence_number").default(0),
  // Enhanced features
  canvasData: jsonb("canvas_data").$type<any>(), // Fabric.js canvas JSON
  mentions: jsonb("mentions").$type<string[]>().default(sql`'[]'::jsonb`),
  hashtags: jsonb("hashtags").$type<string[]>().default(sql`'[]'::jsonb`),
  location: jsonb("location").$type<{ id: string; name: string; lat?: number; lng?: number }>(),
  musicClip: jsonb("music_clip").$type<{ id: string; title: string; artist: string; url: string; startTime: number; duration: number }>(),
  link: text("link"),
  privacy: varchar("privacy", { length: 20 }).default("public"), // public, close_friends, selected
  selectedViewers: jsonb("selected_viewers").$type<string[]>().default(sql`'[]'::jsonb`),
  interactiveStickers: jsonb("interactive_stickers").$type<any[]>().default(sql`'[]'::jsonb`), // polls, questions, etc.
});

// Follows table
export const follows = pgTable("follows", {
  followerId: varchar("follower_id").notNull(),
  followeeId: varchar("followee_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  approved: boolean("approved").default(true),
});

// Reports table
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull(),
  targetId: varchar("target_id").notNull(),
  targetType: varchar("target_type", { length: 20 }).notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  status: varchar("status", { length: 20 }).default("pending"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email().optional(),
  displayName: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  blockedUsers: z.array(z.string()).optional(),
}).omit({ id: true, joinedAt: true, isActive: true, verified: true, lastSeen: true, isOnline: true, passwordHash: true }).extend({
  password: z.string().min(8),
});

export const insertPostSchema = createInsertSchema(posts, {
  caption: z.string().max(2200).optional(),
  hashtags: z.array(z.string()).optional(),
  privacy: z.enum(["public", "private", "followers"]).optional(),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(["image", "video"]).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true, likeCount: true, commentCount: true, viewCount: true, isArchived: true });

export const insertCommentSchema = createInsertSchema(comments, {
  content: z.string().min(1).max(500),
}).omit({ id: true, createdAt: true, editedAt: true });

export const insertMessageSchema = createInsertSchema(messages, {
  content: z.string().min(1).max(2000),
}).omit({ id: true, createdAt: true, readBy: true });

export const insertConversationSchema = createInsertSchema(conversations, {
  participantIds: z.array(z.string()).min(2),
  title: z.string().max(100).optional(),
  isMuted: z.boolean().optional(),
  mutedUntil: z.date().optional(),
  readReceiptEnabled: z.boolean().optional(),
}).omit({ id: true, createdAt: true, lastMessageAt: true });

export const insertStorySchema = createInsertSchema(stories, {
  mediaUrl: z.string().url(),
  mediaType: z.enum(["image", "video"]),
  mentions: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  privacy: z.enum(["public", "close_friends", "selected"]).optional(),
  selectedViewers: z.array(z.string()).optional(),
  location: z.object({
    id: z.string(),
    name: z.string(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
  musicClip: z.object({
    id: z.string(),
    title: z.string(),
    artist: z.string(),
    url: z.string(),
    startTime: z.number(),
    duration: z.number(),
  }).optional(),
  link: z.string().url().optional(),
  canvasData: z.any().optional(),
  interactiveStickers: z.array(z.any()).optional(),
}).omit({ id: true, createdAt: true, expiresAt: true });

export const insertFollowSchema = createInsertSchema(follows).omit({ createdAt: true });

export const insertReportSchema = createInsertSchema(reports, {
  reason: z.string().min(10).max(500),
  targetType: z.enum(["post", "user", "comment"]),
}).omit({ id: true, createdAt: true, status: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof stories.$inferSelect;

export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type Follow = typeof follows.$inferSelect;

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export type Notification = typeof notifications.$inferSelect;
export type Like = typeof likes.$inferSelect;

// Extended types for API responses
export type UserProfile = User & {
  followerCount: number;
  followingCount: number;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
};

export type PostWithUser = Post & {
  user: User;
  isLiked?: boolean;
  comments?: CommentWithUser[];
};

export type CommentWithUser = Comment & {
  user: User;
};

export type MessageWithSender = Message & {
  sender: User;
};

export type ConversationWithDetails = Conversation & {
  participants: User[];
  lastMessage?: Message;
  unreadCount?: number;
};

export type NotificationWithActor = Notification & {
  actor: User;
};

export type StoryWithUser = Story & {
  user: User;
};

// Safe user DTO for public endpoints (excludes sensitive data)
export type SafeUserDTO = Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'verified' | 'bio' | 'isPrivate' | 'isOnline'>;

// Story creation types (Frontend types for enhanced story editor)
export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  file?: File;
  thumbnail?: string;
}

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  rotation?: number;
  width?: number;
}

export interface DrawingPath {
  id: string;
  points: number[];
  color: string;
  width: number;
}

export interface InteractiveSticker {
  id: string;
  type: 'poll' | 'question' | 'quiz' | 'countdown' | 'slider';
  x: number;
  y: number;
  data: any; // Type-specific data
}

export interface PollSticker extends InteractiveSticker {
  type: 'poll';
  data: {
    question: string;
    options: string[];
  };
}

export interface QuestionSticker extends InteractiveSticker {
  type: 'question';
  data: {
    question: string;
  };
}

export interface QuizSticker extends InteractiveSticker {
  type: 'quiz';
  data: {
    question: string;
    options: string[];
    correctAnswer: number;
  };
}

export interface CountdownSticker extends InteractiveSticker {
  type: 'countdown';
  data: {
    name: string;
    endTime: Date;
  };
}

export interface SliderSticker extends InteractiveSticker {
  type: 'slider';
  data: {
    question: string;
    emoji: string;
  };
}

export interface LocationData {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
}

export interface MusicClipData {
  id: string;
  title: string;
  artist: string;
  url: string;
  coverUrl?: string;
  startTime: number;
  duration: number;
}

export interface StoryDraft {
  mediaItems: MediaItem[];
  activeMediaId: string | null;
  canvasData: any; // Fabric.js canvas JSON
  textOverlays: TextOverlay[];
  drawings: DrawingPath[];
  filter?: string;
  mentions: string[];
  hashtags: string[];
  location?: LocationData;
  musicClip?: MusicClipData;
  link?: string;
  privacy: 'public' | 'close_friends' | 'selected';
  selectedViewers: string[];
  interactiveStickers: InteractiveSticker[];
}
