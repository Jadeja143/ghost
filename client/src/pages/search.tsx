import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search as SearchIcon, Hash, User } from 'lucide-react';
import { useLocation } from 'wouter';
import type { User as UserType, PostWithUser } from '@shared/schema';
import { PostCard } from '@/components/post-card';

export default function Search() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'posts'>('users');

  const { data: users } = useQuery<UserType[]>({
    queryKey: ['/api/search/users', searchQuery],
    enabled: searchQuery.length > 0 && activeTab === 'users',
  });

  const { data: posts } = useQuery<PostWithUser[]>({
    queryKey: ['/api/search/posts', searchQuery],
    enabled: searchQuery.length > 0 && activeTab === 'posts',
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Card className="p-6 mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search users, posts, or hashtags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
            data-testid="input-search"
          />
        </div>
      </Card>

      {searchQuery.length > 0 ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6">
            <TabsTrigger value="users" data-testid="tab-users">
              <User className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="posts" data-testid="tab-posts">
              <Hash className="h-4 w-4 mr-2" />
              Posts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-2">
            {users && users.length > 0 ? (
              users.map((user) => (
                <Card
                  key={user.id}
                  className="p-4 cursor-pointer hover-elevate"
                  onClick={() => navigate(`/profile/${user.id}`)}
                  data-testid={`user-result-${user.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold font-mono">{user.username}</p>
                        {user.displayName && (
                          <p className="text-sm text-muted-foreground">
                            {user.displayName}
                          </p>
                        )}
                        {user.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {user.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-12 text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No users found</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="posts" className="space-y-6">
            {posts && posts.length > 0 ? (
              posts.map((post) => <PostCard key={post.id} post={post} />)
            ) : (
              <Card className="p-12 text-center text-muted-foreground">
                <Hash className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No posts found</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">
          <SearchIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>Start typing to search</p>
        </Card>
      )}
    </div>
  );
}
