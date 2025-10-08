import { useState } from 'react';
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
import { Loader2, Upload } from 'lucide-react';
import { useLocation } from 'wouter';
import { useTheme } from '@/lib/theme';

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

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
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl || user.avatarUrl || undefined} />
              <AvatarFallback className="text-2xl">
                {user.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input
                id="avatar"
                data-testid="input-avatar-url"
                placeholder="https://example.com/avatar.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Paste a URL to your profile picture
              </p>
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
