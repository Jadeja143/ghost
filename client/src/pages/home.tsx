import { useQuery } from '@tanstack/react-query';
import { PostCard } from '@/components/post-card';
import { StoriesCarousel } from '@/components/stories-carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import type { PostWithUser } from '@shared/schema';

export default function Home() {
  const { data: posts, isLoading } = useQuery<PostWithUser[]>({
    queryKey: ['/api/posts/feed'],
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Stories */}
      <StoriesCarousel />

      {/* Posts Feed */}
      <div className="space-y-6">
        {isLoading ? (
          // Loading skeletons
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="w-full aspect-square" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </Card>
            ))}
          </>
        ) : posts && posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          // Empty state
          <Card className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
            <p className="text-muted-foreground mb-6">
              Follow some users to see their posts in your feed
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
