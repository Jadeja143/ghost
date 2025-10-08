import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, X, Image as ImageIcon, Loader2, Upload, FileImage } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

export function CreatePostDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createPostMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/posts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts/feed'] });
      handleOpenChange(false);
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
    setFileSize(null);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    setOpen(newOpen);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please select an image file',
      });
      return;
    }

    setFileSize(file.size);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
      setMediaUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleRemoveMedia = () => {
    setMediaPreview(null);
    setMediaUrl('');
    setFileSize(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="rounded-full h-14 w-14 fixed bottom-6 right-6 shadow-lg z-50 md:hidden bg-gradient-to-r from-primary via-purple-500 to-pink-500 hover:shadow-xl hover:scale-105 transition-all"
          data-testid="button-create-post-mobile"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Create new post
          </DialogTitle>
          <DialogDescription>
            Share your moments with the world
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* User Info */}
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-purple-500 text-white">
                {user.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold font-mono">{user.username}</p>
          </motion.div>

          {/* Media Upload/Preview Area */}
          <AnimatePresence mode="wait">
            {mediaPreview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="relative w-full max-h-[400px] rounded-xl overflow-hidden bg-muted border-2 border-primary/20">
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    data-testid="img-post-preview"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-lg backdrop-blur-sm bg-background/80 hover:bg-background"
                    onClick={handleRemoveMedia}
                    data-testid="button-remove-media"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {fileSize && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <FileImage className="h-4 w-4" />
                    <span>File size: {formatFileSize(fileSize)}</span>
                    {fileSize > 5 * 1024 * 1024 && (
                      <span className="text-orange-500 text-xs">
                        (Large file - consider compressing)
                      </span>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300
                  ${isDragging 
                    ? 'border-primary bg-primary/5 scale-[1.02]' 
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleMediaChange}
                  data-testid="input-media-file"
                />
                <div className="relative p-12">
                  {/* Gradient orb effect */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
                  </div>

                  <div className="relative flex flex-col items-center gap-4 text-center">
                    <motion.div
                      animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="p-4 rounded-full bg-gradient-to-br from-primary/10 to-purple-500/10"
                    >
                      <Upload className="h-10 w-10 text-primary" />
                    </motion.div>
                    
                    <div className="space-y-2">
                      <p className="text-lg font-semibold">
                        {isDragging ? 'Drop your image here' : 'Upload a photo'}
                      </p>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        Drag and drop an image, or click to browse
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-upload-media"
                      className="mt-2 border-primary/50 hover:bg-primary/5"
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Choose from device
                    </Button>

                    <p className="text-xs text-muted-foreground">
                      Recommended: JPG, PNG, or WEBP under 5MB
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Caption */}
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.2 }}
          >
            <Label htmlFor="caption" className="text-sm font-semibold">
              Caption
            </Label>
            <Textarea
              id="caption"
              data-testid="input-caption"
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[100px] resize-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </motion.div>

          {/* Hashtags */}
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.2 }}
          >
            <Label htmlFor="hashtags" className="text-sm font-semibold">
              Hashtags
            </Label>
            <Input
              id="hashtags"
              data-testid="input-hashtags"
              placeholder="#travel #food #photography"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className="focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <p className="text-xs text-muted-foreground">
              Separate hashtags with spaces or commas
            </p>
          </motion.div>

          {/* Submit */}
          <motion.div 
            className="flex gap-3 justify-end pt-4 border-t"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.2 }}
          >
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createPostMutation.isPending}
              data-testid="button-cancel-post"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createPostMutation.isPending || (!caption && !mediaUrl)}
              data-testid="button-submit-post"
              className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 hover:shadow-lg hover:scale-105 transition-all"
            >
              {createPostMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Share Post
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
