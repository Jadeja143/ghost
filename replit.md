# Social Network MVP

## Overview

A modern social networking application built with React, Express, and PostgreSQL. The platform provides Instagram-inspired social features including posts with media, real-time messaging, stories, notifications, and user profiles. The application emphasizes a clean, content-first design with support for both light and dark themes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management and caching
- Tailwind CSS for styling with shadcn/ui component library

**Design System:**
- Custom design tokens based on Instagram/Threads visual language
- Radix UI primitives for accessible, unstyled components
- Comprehensive theme system supporting light/dark modes
- Content-first approach with minimal UI chrome
- Responsive layout system using Tailwind spacing primitives

**State Management:**
- TanStack Query handles all server state with automatic caching and invalidation
- React Context for authentication state and theme preferences
- Local component state for UI-specific interactions

**Key Features:**
- Protected and public route handling with authentication middleware
- Real-time updates via WebSocket connections
- Optimistic UI updates for likes and interactions
- Image-first post cards with engagement metrics
- Stories carousel with ephemeral content
- Direct messaging with conversation threads
- User search and discovery
- Profile management with privacy controls

### Backend Architecture

**Technology Stack:**
- Express.js for the REST API server
- TypeScript for type safety across frontend and backend
- Drizzle ORM for database operations and migrations
- PostgreSQL (via Neon serverless) as the primary database
- JWT for stateless authentication
- bcrypt for password hashing
- WebSocket server for real-time features

**API Design:**
- RESTful endpoints organized by resource (users, posts, messages, etc.)
- JWT bearer token authentication middleware
- Centralized error handling
- Request/response logging for debugging
- Zod schemas for request validation shared between client and server

**Database Schema:**
- Users table with profile information, verification status, and online presence
- Posts with media support, privacy settings, and engagement metrics
- Comments system with nested threading capability
- Likes as a many-to-many relationship
- Messages and conversations for direct messaging
- Stories with expiration logic
- Notifications with read/unread status
- Follow relationships for social graph
- Reports for content moderation

**Real-time Communication:**
- WebSocket connections authenticated via JWT tokens
- Client connection management with automatic reconnection
- Event-based messaging for notifications, messages, and live updates

### External Dependencies

**Database:**
- Neon Serverless PostgreSQL for production database hosting
- Drizzle Kit for schema migrations and database management

**UI Components:**
- Radix UI component primitives (@radix-ui/react-*)
- shadcn/ui configuration for consistent component styling
- Lucide React for iconography

**Utilities:**
- date-fns for date formatting and manipulation
- class-variance-authority (CVA) for component variant management
- clsx and tailwind-merge for className composition
- Zod for runtime schema validation

**Development Tools:**
- Replit-specific plugins for development environment
- TypeScript for type checking without compilation
- ESBuild for production bundling

**Authentication:**
- JSON Web Tokens (jsonwebtoken) for stateless auth
- bcrypt for secure password hashing (bcrypt 6.0.0)

**WebSocket:**
- ws (WebSocket) library for real-time bidirectional communication
- Custom reconnection logic on the client side