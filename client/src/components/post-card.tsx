import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { PostWithUser } from '@shared/schema';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface PostCardProps {
  post: PostWithUser;
}

export function PostCard({ post }: PostCardProps) {
  const [, navigate] = useLocation();
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);

  const likeMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/posts/${post.id}/like`, {}),
    onMutate: () => {
      setIsLiked(!isLiked);
      setLikeCount((prev) => (isLiked ? Math.max(0, prev - 1) : prev + 1));
    },
    onError: () => {
      setIsLiked(!isLiked);
      setLikeCount((prev) => (isLiked ? prev + 1 : Math.max(0, prev - 1)));
    },
  });

  const handleLike = () => {
    likeMutation.mutate();
  };

  return (
    <Card className="overflow-hidden" data-testid={`card-post-${post.id}`}>
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div
          className="flex items-center gap-3 cursor-pointer hover-elevate active-elevate-2 -m-2 p-2 rounded-lg"
          onClick={() => navigate(`/profile/${post.userId}`)}
          data-testid={`link-user-${post.userId}`}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.user.avatarUrl || undefined} />
            <AvatarFallback>{post.user.username[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm font-mono">{post.user.username}</p>
            <p className="text-xs text-muted-foreground">
              {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : 'Just now'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" data-testid={`button-post-menu-${post.id}`}>
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      {/* Post Image */}
      {post.mediaUrl && (
        <div className="relative w-full aspect-square bg-muted">
          {post.mediaType === 'image' ? (
            <img
              src={post.mediaUrl}
              alt={post.caption || 'Post image'}
              className="w-full h-full object-cover"
              data-testid={`img-post-${post.id}`}
            />
          ) : (
            <video
              src={post.mediaUrl}
              controls
              className="w-full h-full object-cover"
              data-testid={`video-post-${post.id}`}
            />
          )}
        </div>
      )}

      {/* Post Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLike}
              className={isLiked ? 'text-destructive' : ''}
              data-testid={`button-like-${post.id}`}
            >
              <Heart className={`h-6 w-6 ${isLiked ? 'fill-current' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/post/${post.id}`)}
              data-testid={`button-comment-${post.id}`}
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon" data-testid={`button-share-${post.id}`}>
              <Send className="h-6 w-6" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" data-testid={`button-bookmark-${post.id}`}>
            <Bookmark className="h-6 w-6" />
          </Button>
        </div>

        {/* Like Count */}
        <div className="font-semibold text-sm" data-testid={`text-likes-${post.id}`}>
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </div>

        {/* Caption */}
        {post.caption && (
          <div className="text-sm" data-testid={`text-caption-${post.id}`}>
            <span className="font-semibold font-mono mr-2">{post.user.username}</span>
            <span className="whitespace-pre-wrap">{post.caption}</span>
          </div>
        )}

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.hashtags.map((tag, index) => (
              <span
                key={index}
                className="text-primary text-sm cursor-pointer hover:underline"
                onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
                data-testid={`link-hashtag-${tag}`}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* View Comments */}
        {(post.commentCount || 0) > 0 && (
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/post/${post.id}`)}
            data-testid={`link-comments-${post.id}`}
          >
            View all {post.commentCount} comments
          </button>
        )}
      </div>
    </Card>
  );
}
