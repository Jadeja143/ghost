import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCard } from '@/components/post-card';
import { Settings, MessageCircle, UserPlus, UserCheck, Lock } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, PostWithUser } from '@shared/schema';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['/api/users', id],
  });

  const { data: posts, isLoading: postsLoading } = useQuery<PostWithUser[]>({
    queryKey: ['/api/posts/user', id],
  });

  const followMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/users/${id}/follow`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', id] });
      toast({
        title: profile?.isFollowing ? 'Unfollowed' : 'Following',
        description: profile?.isFollowing
          ? `You are no longer following ${profile.username}`
          : `You are now following ${profile?.username}`,
      });
    },
  });

  const isOwnProfile = currentUser?.id === id;

  if (profileLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="flex items-start gap-8">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-2">User not found</h2>
        <p className="text-muted-foreground mb-6">
          This profile doesn't exist or has been deleted
        </p>
        <Button onClick={() => navigate('/')} data-testid="button-back-home">
          Go back home
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-start gap-8 mb-8">
        {/* Avatar */}
        <Avatar className="h-32 w-32" data-testid="img-profile-avatar">
          <AvatarImage src={profile.avatarUrl || undefined} />
          <AvatarFallback className="text-4xl">
            {profile.username[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Profile Info */}
        <div className="flex-1 w-full">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <h1 className="text-2xl font-semibold font-mono" data-testid="text-username">
              {profile.username}
            </h1>
            {profile.verified && (
              <span className="text-primary text-sm">✓ Verified</span>
            )}
            {profile.isPrivate && (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-8 mb-4">
            <div data-testid="text-posts-count">
              <span className="font-semibold">{posts?.length || 0}</span>
              <span className="text-muted-foreground ml-1">posts</span>
            </div>
            <div data-testid="text-followers-count">
              <span className="font-semibold">{profile.followerCount}</span>
              <span className="text-muted-foreground ml-1">followers</span>
            </div>
            <div data-testid="text-following-count">
              <span className="font-semibold">{profile.followingCount}</span>
              <span className="text-muted-foreground ml-1">following</span>
            </div>
          </div>

          {/* Display Name & Bio */}
          {profile.displayName && (
            <p className="font-semibold mb-1" data-testid="text-display-name">
              {profile.displayName}
            </p>
          )}
          {profile.bio && (
            <p className="text-sm whitespace-pre-wrap mb-4" data-testid="text-bio">
              {profile.bio}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {isOwnProfile ? (
              <Button
                variant="outline"
                onClick={() => navigate('/settings')}
                data-testid="button-edit-profile"
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button
                  variant={profile.isFollowing ? 'outline' : 'default'}
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  data-testid="button-follow"
                >
                  {profile.isFollowing ? (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/messages/new?user=${id}`)}
                  data-testid="button-message"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-6">
          <TabsTrigger value="posts" data-testid="tab-posts">
            Posts
          </TabsTrigger>
          <TabsTrigger value="saved" data-testid="tab-saved">
            Saved
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-6">
          {postsLoading ? (
            <div className="grid grid-cols-3 gap-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground">
                {isOwnProfile
                  ? 'Share your first post'
                  : `${profile.username} hasn't posted anything yet`}
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="saved">
          <Card className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Saved posts</h3>
            <p className="text-muted-foreground">
              Only you can see your saved posts
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
