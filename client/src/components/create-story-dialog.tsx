import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStoryDialog({ open, onOpenChange }: CreateStoryDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createStoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/stories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stories'] });
      handleOpenChange(false);
      toast({
        title: 'Story created',
        description: 'Your story has been shared successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create story',
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setMediaUrl('');
    setMediaType(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (!isVideo && !isImage) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please select an image or video file',
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
        setMediaUrl(reader.result as string);
        setMediaType(isVideo ? 'video' : 'image');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!mediaUrl || !mediaType) {
      toast({
        variant: 'destructive',
        title: 'Media required',
        description: 'Please select an image or video for your story',
      });
      return;
    }

    createStoryMutation.mutate({
      mediaUrl,
      mediaType,
    });
  };

  const handleRemoveMedia = () => {
    setMediaPreview(null);
    setMediaUrl('');
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create new story</DialogTitle>
          <DialogDescription>
            Upload a photo or video to share your story
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* User Info */}
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="font-semibold font-mono">{user.username}</p>
          </motion.div>

          {/* Media Preview */}
          <AnimatePresence mode="wait">
            {mediaPreview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="relative w-full aspect-[9/16] max-h-[500px] rounded-lg overflow-hidden bg-muted"
              >
                {mediaType === 'image' ? (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    data-testid="img-story-preview"
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    className="w-full h-full object-cover"
                    controls
                    data-testid="video-story-preview"
                  />
                )}
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveMedia}
                  data-testid="button-remove-story-media"
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleMediaChange}
                  data-testid="input-story-media-file"
                />
                <Button
                  variant="outline"
                  className="w-full h-32 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-story-media"
                >
                  <div className="flex gap-2 items-center">
                    <ImageIcon className="h-6 w-6" />
                    <Video className="h-6 w-6" />
                  </div>
                  <span>Add photo or video</span>
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Stories disappear after 24 hours
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.div 
            className="flex gap-2 justify-end pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createStoryMutation.isPending}
              data-testid="button-cancel-story"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createStoryMutation.isPending || !mediaUrl}
              data-testid="button-submit-story"
            >
              {createStoryMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Share Story
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
