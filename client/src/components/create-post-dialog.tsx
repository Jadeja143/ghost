import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function CreatePostDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createPostMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/posts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts/feed'] });
      setOpen(false);
      resetForm();
      toast({
        title: 'Post created',
        description: 'Your post has been shared successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create post',
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setCaption('');
    setHashtags('');
    setMediaUrl('');
    setMediaPreview(null);
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
        setMediaUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    const hashtagArray = hashtags
      .split(/[,\s]+/)
      .map((tag) => tag.replace(/^#/, '').trim())
      .filter((tag) => tag.length > 0);

    createPostMutation.mutate({
      caption,
      hashtags: hashtagArray,
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaUrl ? 'image' : undefined,
      privacy: 'public',
    });
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="rounded-full h-14 w-14 fixed bottom-6 right-6 shadow-lg z-50 md:hidden"
          data-testid="button-create-post-mobile"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create new post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="font-semibold font-mono">{user.username}</p>
          </div>

          {/* Media Preview */}
          {mediaPreview && (
            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">
              <img
                src={mediaPreview}
                alt="Preview"
                className="w-full h-full object-cover"
                data-testid="img-post-preview"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => {
                  setMediaPreview(null);
                  setMediaUrl('');
                }}
                data-testid="button-remove-media"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              data-testid="input-caption"
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label htmlFor="hashtags">Hashtags</Label>
            <Input
              id="hashtags"
              data-testid="input-hashtags"
              placeholder="#travel #food #photography"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
          </div>

          {/* Media Upload */}
          {!mediaPreview && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleMediaChange}
                data-testid="input-media-file"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-upload-media"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Add photo or video
              </Button>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createPostMutation.isPending}
              data-testid="button-cancel-post"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createPostMutation.isPending || (!caption && !mediaUrl)}
              data-testid="button-submit-post"
            >
              {createPostMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
