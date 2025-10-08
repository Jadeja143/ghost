import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, Upload, Camera, FileImage, Link as LinkIcon, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { useTheme } from '@/lib/theme';
import { motion, AnimatePresence } from 'framer-motion';

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PATCH', '/api/users/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      toast({
        title: 'Profile updated',
        description: 'Your changes have been saved successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update profile',
        description: error.message,
      });
    },
  });

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please select an image file (JPG, PNG, WEBP)',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please select an image under 5MB',
      });
      return;
    }

    setIsProcessing(true);
    setFileSize(file.size);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
      setAvatarUrl(reader.result as string);
      setIsProcessing(false);
    };
    reader.onerror = () => {
      toast({
        variant: 'destructive',
        title: 'Failed to process image',
        description: 'Please try again',
      });
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarUrl('');
    setFileSize(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSave = () => {
    updateProfileMutation.mutate({
      displayName: displayName || undefined,
      bio: bio || undefined,
      isPrivate,
      avatarUrl: avatarUrl || undefined,
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your profile details and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload Section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Profile Picture</Label>
            
            {/* Avatar Preview and Upload Zone */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar with Drag and Drop */}
              <motion.div
                className="relative group"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  data-testid="input-avatar-file"
                />
                
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative cursor-pointer transition-all duration-300
                    ${isDragging ? 'ring-4 ring-primary ring-offset-4 scale-105' : 'hover:ring-4 hover:ring-primary/50 hover:ring-offset-2'}
                  `}
                  data-testid="avatar-upload-zone"
                >
                  <Avatar className="h-32 w-32 border-2 border-border">
                    <AvatarImage src={avatarPreview || avatarUrl || user.avatarUrl || undefined} />
                    <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-purple-500 text-white">
                      {user.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Hover Overlay */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    initial={false}
                  >
                    <Camera className="h-8 w-8 text-white" />
                  </motion.div>

                  {/* Processing Overlay */}
                  <AnimatePresence>
                    {isProcessing && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-full"
                      >
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Drag Indicator */}
                  <AnimatePresence>
                    {isDragging && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-primary/20 rounded-full border-2 border-primary border-dashed"
                      >
                        <Upload className="h-8 w-8 text-primary" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Upload Actions */}
              <div className="flex-1 space-y-3 w-full sm:w-auto">
                <p className="text-sm text-muted-foreground">
                  Click on avatar to upload or drag and drop
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    data-testid="button-upload-avatar"
                    className="border-primary/50 hover:bg-primary/5"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                  </Button>
                  
                  {(avatarPreview || avatarUrl) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={isProcessing}
                      data-testid="button-remove-avatar"
                      className="border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    data-testid="button-toggle-url-input"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <LinkIcon className="mr-2 h-4 w-4" />
                    {showUrlInput ? 'Hide URL' : 'Use URL'}
                  </Button>
                </div>

                {/* File Info */}
                <AnimatePresence>
                  {fileSize && !showUrlInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-sm text-muted-foreground overflow-hidden"
                    >
                      <FileImage className="h-4 w-4" />
                      <span>{formatFileSize(fileSize)}</span>
                      {fileSize > 5 * 1024 * 1024 && (
                        <span className="text-orange-500 text-xs">
                          (Consider compressing)
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* URL Input (Alternative) */}
                <AnimatePresence>
                  {showUrlInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <Input
                        id="avatar-url"
                        data-testid="input-avatar-url"
                        placeholder="https://example.com/avatar.jpg"
                        value={avatarUrl}
                        onChange={(e) => {
                          setAvatarUrl(e.target.value);
                          setAvatarPreview(null);
                          setFileSize(null);
                        }}
                        className="focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste a direct URL to your profile picture
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-xs text-muted-foreground">
                  Recommended: Square image, JPG or PNG under 5MB
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Username */}
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={user.username} disabled data-testid="input-username" />
            <p className="text-xs text-muted-foreground">
              Username cannot be changed
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              data-testid="input-display-name"
              placeholder="Enter your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              data-testid="input-bio"
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {bio.length}/500 characters
            </p>
          </div>

          <Separator />

          {/* Privacy */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Private Account</Label>
              <p className="text-sm text-muted-foreground">
                Only approved followers can see your posts
              </p>
            </div>
            <Switch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              data-testid="switch-private"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={updateProfileMutation.isPending}
            className="w-full"
            data-testid="button-save-profile"
          >
            {updateProfileMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the app looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark themes
              </p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              data-testid="switch-dark-mode"
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            Log Out
          </Button>
          <Button variant="destructive" className="w-full" data-testid="button-delete-account">
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
