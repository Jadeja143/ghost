/**
 * Audience Privacy Panel
 * Inspired by Telegram's contact-based privacy selector
 * Options: Public, Close Friends, Selected Contacts
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Globe, Users, UserCheck, Loader2 } from 'lucide-react';
import { useStoryDraft } from './story-context';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

interface AudiencePrivacyPanelProps {
  onNext: () => void;
  onBack: () => void;
}

export function AudiencePrivacyPanel({ onNext, onBack }: AudiencePrivacyPanelProps) {
  const { draft, updateDraft } = useStoryDraft();
  const [selectedUsers, setSelectedUsers] = useState<string[]>(draft.selectedViewers);

  // Fetch close friends list (Telegram-inspired contact picker)
  const { data: closeFriends, isLoading: isLoadingCloseFriends } = useQuery({
    queryKey: ['/api/users/close-friends'],
    enabled: draft.privacy === 'close_friends',
  });

  // Fetch all followers for custom selection
  const { data: followers, isLoading: isLoadingFollowers } = useQuery({
    queryKey: ['/api/users/followers'],
    enabled: draft.privacy === 'selected',
  });

  const handlePrivacyChange = (privacy: 'public' | 'close_friends' | 'selected') => {
    updateDraft({ privacy, selectedViewers: [] });
    setSelectedUsers([]);
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = selectedUsers.includes(userId)
      ? selectedUsers.filter(id => id !== userId)
      : [...selectedUsers, userId];
    
    setSelectedUsers(newSelected);
    updateDraft({ selectedViewers: newSelected });
  };

  return (
    <div className="space-y-6" data-testid="panel-privacy">
      <h3 className="text-lg font-semibold">Who can see this story?</h3>

      <RadioGroup
        value={draft.privacy}
        onValueChange={(value) => handlePrivacyChange(value as any)}
      >
        {/* Public */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0 }}
          className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer hover:bg-accent"
          onClick={() => handlePrivacyChange('public')}
        >
          <RadioGroupItem value="public" id="public" data-testid="radio-privacy-public" />
          <div className="flex items-center gap-3 flex-1">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <Label htmlFor="public" className="cursor-pointer font-medium">
                Public
              </Label>
              <p className="text-sm text-muted-foreground">
                Everyone can see your story
              </p>
            </div>
          </div>
        </motion.div>

        {/* Close Friends */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer hover:bg-accent"
          onClick={() => handlePrivacyChange('close_friends')}
        >
          <RadioGroupItem value="close_friends" id="close_friends" data-testid="radio-privacy-close-friends" />
          <div className="flex items-center gap-3 flex-1">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <Label htmlFor="close_friends" className="cursor-pointer font-medium">
                Close Friends
              </Label>
              <p className="text-sm text-muted-foreground">
                Only your close friends can see
              </p>
            </div>
          </div>
        </motion.div>

        {/* Selected Contacts */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer hover:bg-accent"
          onClick={() => handlePrivacyChange('selected')}
        >
          <RadioGroupItem value="selected" id="selected" data-testid="radio-privacy-selected" />
          <div className="flex items-center gap-3 flex-1">
            <UserCheck className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <Label htmlFor="selected" className="cursor-pointer font-medium">
                Selected Contacts
              </Label>
              <p className="text-sm text-muted-foreground">
                Choose specific people
              </p>
            </div>
          </div>
        </motion.div>
      </RadioGroup>

      {/* Close Friends List */}
      {draft.privacy === 'close_friends' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-sm font-medium">Your Close Friends</p>
          {isLoadingCloseFriends ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {(closeFriends as any[])?.length || 0} people in your close friends list
            </div>
          )}
        </motion.div>
      )}

      {/* Selected Contacts Picker (Telegram-inspired) */}
      {draft.privacy === 'selected' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-sm font-medium">
            Select People ({selectedUsers.length} selected)
          </p>
          {isLoadingFollowers ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <ScrollArea className="h-64 border rounded-lg p-2">
              <div className="space-y-2">
                {(followers as any[])?.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => toggleUserSelection(user.id)}
                    data-testid={`user-select-${user.id}`}
                  >
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{user.username}</p>
                      {user.displayName && (
                        <p className="text-xs text-muted-foreground">{user.displayName}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
          data-testid="button-back-to-stickers"
        >
          Back
        </Button>
        <Button
          onClick={onNext}
          className="flex-1"
          disabled={draft.privacy === 'selected' && selectedUsers.length === 0}
          data-testid="button-next-to-review"
        >
          Next: Review
        </Button>
      </div>
    </div>
  );
}
