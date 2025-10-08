import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CreateStoryDialog } from '@/components/create-story-dialog';
import type { StoryWithUser } from '@shared/schema';

export function StoriesCarousel() {
  const { user } = useAuth();
  const [selectedStory, setSelectedStory] = useState<StoryWithUser | null>(null);
  const [createStoryOpen, setCreateStoryOpen] = useState(false);

  const { data: stories } = useQuery<StoryWithUser[]>({
    queryKey: ['/api/stories'],
  });

  return (
    <>
      <Card className="p-4">
        <div className="flex gap-4 overflow-x-auto">
          {/* Add Story */}
          {user && (
            <div
              className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer hover-elevate active-elevate-2 -m-2 p-2 rounded-lg"
              onClick={() => setCreateStoryOpen(true)}
              data-testid="button-create-story"
            >
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 h-6 w-6 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                  <Plus className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
              <span className="text-xs text-center line-clamp-1 font-mono">
                Your Story
              </span>
            </div>
          )}

          {/* Stories */}
          {stories?.map((story) => (
            <div
              key={story.id}
              className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer hover-elevate active-elevate-2 -m-2 p-2 rounded-lg"
              onClick={() => setSelectedStory(story)}
              data-testid={`button-story-${story.id}`}
            >
              <div className="relative">
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-primary to-destructive">
                  <div className="p-0.5 bg-background rounded-full">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={story.user.avatarUrl || undefined} />
                      <AvatarFallback>
                        {story.user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
              <span className="text-xs text-center line-clamp-1 font-mono">
                {story.user.username}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Story Viewer */}
      <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
        <DialogContent className="max-w-md p-0 bg-black">
          {selectedStory && (
            <div className="relative h-[80vh]">
              {selectedStory.mediaType === 'image' ? (
                <img
                  src={selectedStory.mediaUrl}
                  alt="Story"
                  className="w-full h-full object-contain"
                  data-testid="img-story-viewer"
                />
              ) : (
                <video
                  src={selectedStory.mediaUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                  data-testid="video-story-viewer"
                />
              )}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedStory.user.avatarUrl || undefined} />
                  <AvatarFallback>
                    {selectedStory.user.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white font-semibold font-mono">
                  {selectedStory.user.username}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Story Dialog */}
      <CreateStoryDialog open={createStoryOpen} onOpenChange={setCreateStoryOpen} />
    </>
  );
}
