/**
 * Social Enhancements Panel
 * Inspired by Telegram's mention and hashtag system
 * Features: mentions, hashtags, location, music, links
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AtSign, Hash, MapPin, Music, Link as LinkIcon, 
  X, Search, Loader2 
} from 'lucide-react';
import { useStoryDraft } from './story-context';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { LocationData, MusicClipData } from '@shared/schema';

interface SocialEnhancementsPanelProps {
  onNext: () => void;
  onBack: () => void;
}

export function SocialEnhancementsPanel({ onNext, onBack }: SocialEnhancementsPanelProps) {
  const { draft, updateDraft } = useStoryDraft();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [mentionSearch, setMentionSearch] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [musicSearch, setMusicSearch] = useState('');
  const [linkInput, setLinkInput] = useState('');

  // Search users for mentions (Telegram-inspired mention search)
  const { data: userResults, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users/search', mentionSearch],
    enabled: mentionSearch.length > 2,
  });

  // Search locations
  const { data: locationResults, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['/api/locations/search', locationSearch],
    enabled: locationSearch.length > 2,
  });

  // Search music
  const { data: musicResults, isLoading: isLoadingMusic } = useQuery({
    queryKey: ['/api/music/search', musicSearch],
    enabled: musicSearch.length > 2,
  });

  const addMention = (userId: string, username: string) => {
    if (!draft.mentions.includes(userId)) {
      updateDraft({ mentions: [...draft.mentions, userId] });
      toast({
        title: 'Mention added',
        description: `@${username} will be notified`,
      });
    }
    setMentionSearch('');
  };

  const removeMention = (userId: string) => {
    updateDraft({ mentions: draft.mentions.filter(id => id !== userId) });
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !draft.hashtags.includes(tag)) {
      updateDraft({ hashtags: [...draft.hashtags, tag] });
      setHashtagInput('');
    }
  };

  const removeHashtag = (tag: string) => {
    updateDraft({ hashtags: draft.hashtags.filter(t => t !== tag) });
  };

  const setLocation = (location: LocationData) => {
    updateDraft({ location });
    setLocationSearch('');
  };

  const setMusic = (music: MusicClipData) => {
    updateDraft({ musicClip: music });
    setMusicSearch('');
  };

  const addLink = () => {
    if (!user?.verified) {
      toast({
        variant: 'destructive',
        title: 'Verified accounts only',
        description: 'Link stickers are available for verified accounts',
      });
      return;
    }

    try {
      new URL(linkInput);
      updateDraft({ link: linkInput });
      toast({
        title: 'Link added',
        description: 'Link sticker will appear on your story',
      });
      setLinkInput('');
    } catch {
      toast({
        variant: 'destructive',
        title: 'Invalid URL',
        description: 'Please enter a valid URL',
      });
    }
  };

  return (
    <div className="space-y-6" data-testid="panel-social-enhancements">
      <h3 className="text-lg font-semibold">Add Details</h3>

      {/* Mentions */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <AtSign className="h-4 w-4" />
          Tag People
        </Label>
        <div className="relative">
          <Input
            placeholder="Search users..."
            value={mentionSearch}
            onChange={(e) => setMentionSearch(e.target.value)}
            data-testid="input-mention-search"
          />
          {isLoadingUsers && (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
          )}
        </div>
        
        {/* User search results */}
        <AnimatePresence>
          {userResults && mentionSearch.length > 2 ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ScrollArea className="h-32 border rounded-lg">
                <div className="p-2 space-y-1">
                  {Array.isArray(userResults) && (userResults as any[]).map((u: any) => (
                    <Button
                      key={u.id}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => addMention(u.id, u.username)}
                      data-testid={`button-mention-${u.username}`}
                    >
                      @{u.username}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Selected mentions */}
        {draft.mentions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {draft.mentions.map((userId) => (
              <Badge key={userId} variant="secondary">
                @{userId}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => removeMention(userId)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Hashtags */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Hash className="h-4 w-4" />
          Hashtags
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder="Enter hashtag..."
            value={hashtagInput}
            onChange={(e) => setHashtagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHashtag()}
            data-testid="input-hashtag"
          />
          <Button onClick={addHashtag} data-testid="button-add-hashtag">
            Add
          </Button>
        </div>
        {draft.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {draft.hashtags.map((tag) => (
              <Badge key={tag} variant="secondary">
                #{tag}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => removeHashtag(tag)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location
        </Label>
        <Input
          placeholder="Search location..."
          value={locationSearch}
          onChange={(e) => setLocationSearch(e.target.value)}
          data-testid="input-location-search"
        />
        
        {locationResults && locationSearch.length > 2 ? (
          <ScrollArea className="h-32 border rounded-lg">
            <div className="p-2 space-y-1">
              {Array.isArray(locationResults) && (locationResults as any[]).map((loc: any) => (
                <Button
                  key={loc.id}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setLocation(loc)}
                  data-testid={`button-location-${loc.id}`}
                >
                  {loc.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        ) : null}
        
        {draft.location && (
          <Badge variant="secondary">
            <MapPin className="h-3 w-3 mr-1" />
            {draft.location.name}
            <X
              className="ml-1 h-3 w-3 cursor-pointer"
              onClick={() => updateDraft({ location: undefined })}
            />
          </Badge>
        )}
      </div>

      {/* Music */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Music className="h-4 w-4" />
          Add Music
        </Label>
        <Input
          placeholder="Search music..."
          value={musicSearch}
          onChange={(e) => setMusicSearch(e.target.value)}
          data-testid="input-music-search"
        />
        
        {musicResults && musicSearch.length > 2 ? (
          <ScrollArea className="h-32 border rounded-lg">
            <div className="p-2 space-y-1">
              {Array.isArray(musicResults) && (musicResults as any[]).map((track: any) => (
                <Button
                  key={track.id}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setMusic(track)}
                  data-testid={`button-music-${track.id}`}
                >
                  {track.title} - {track.artist}
                </Button>
              ))}
            </div>
          </ScrollArea>
        ) : null}
        
        {draft.musicClip && (
          <Badge variant="secondary">
            <Music className="h-3 w-3 mr-1" />
            {draft.musicClip.title} - {draft.musicClip.artist}
            <X
              className="ml-1 h-3 w-3 cursor-pointer"
              onClick={() => updateDraft({ musicClip: undefined })}
            />
          </Badge>
        )}
      </div>

      {/* Link (Verified users only) */}
      {user?.verified && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Add Link
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              data-testid="input-link"
            />
            <Button onClick={addLink} data-testid="button-add-link">
              Add
            </Button>
          </div>
          {draft.link && (
            <Badge variant="secondary">
              <LinkIcon className="h-3 w-3 mr-1" />
              {draft.link}
              <X
                className="ml-1 h-3 w-3 cursor-pointer"
                onClick={() => updateDraft({ link: undefined })}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
          data-testid="button-back-to-editor"
        >
          Back
        </Button>
        <Button
          onClick={onNext}
          className="flex-1"
          data-testid="button-next-to-stickers"
        >
          Next: Add Stickers
        </Button>
      </div>
    </div>
  );
}
