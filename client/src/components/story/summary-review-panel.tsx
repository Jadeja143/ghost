/**
 * Summary Review Panel
 * Final review before publishing story
 * Shows preview and all metadata
 */

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Globe, Users, UserCheck, MapPin, Music, 
  Link as LinkIcon, Hash, AtSign, Play,
  BarChart3, MessageSquare, BrainCircuit, Timer, SlidersHorizontal
} from 'lucide-react';
import { useStoryDraft } from './story-context';
import { motion } from 'framer-motion';

interface SummaryReviewPanelProps {
  onBack: () => void;
  onPublish: () => void;
  isPublishing: boolean;
}

const PRIVACY_ICONS = {
  public: Globe,
  close_friends: Users,
  selected: UserCheck,
};

const STICKER_ICONS = {
  poll: BarChart3,
  question: MessageSquare,
  quiz: BrainCircuit,
  countdown: Timer,
  slider: SlidersHorizontal,
};

export function SummaryReviewPanel({ onBack, onPublish, isPublishing }: SummaryReviewPanelProps) {
  const { draft } = useStoryDraft();
  const activeMedia = draft.mediaItems.find(item => item.id === draft.activeMediaId);
  
  const PrivacyIcon = PRIVACY_ICONS[draft.privacy];

  return (
    <div className="space-y-6" data-testid="panel-summary">
      <h3 className="text-lg font-semibold">Review Your Story</h3>

      {/* Preview */}
      {activeMedia && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mx-auto max-w-sm"
        >
          <Card className="overflow-hidden">
            <div
              className="relative aspect-[9/16] bg-black"
              style={{ filter: draft.filter }}
            >
              {activeMedia.type === 'image' ? (
                <img
                  src={activeMedia.url}
                  alt="Story preview"
                  className="w-full h-full object-cover"
                  data-testid="img-story-final-preview"
                />
              ) : (
                <div className="relative w-full h-full">
                  <video
                    src={activeMedia.url}
                    className="w-full h-full object-cover"
                    data-testid="video-story-final-preview"
                  />
                  <Play className="absolute inset-0 m-auto h-12 w-12 text-white" />
                </div>
              )}
              
              {/* Overlay indicators */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Canvas overlays preview */}
                {draft.textOverlays.length > 0 && (
                  <div className="absolute top-4 left-4">
                    <Badge variant="secondary">
                      {draft.textOverlays.length} text overlay(s)
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Story Details */}
      <div className="space-y-4">
        <h4 className="font-medium">Story Details</h4>

        {/* Media Count */}
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {draft.mediaItems.length} media item{draft.mediaItems.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Privacy */}
        <div className="flex items-center gap-2">
          <PrivacyIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm capitalize">{draft.privacy.replace('_', ' ')}</span>
          {draft.privacy === 'selected' && (
            <Badge variant="secondary">{draft.selectedViewers.length} people</Badge>
          )}
        </div>

        {/* Mentions */}
        {draft.mentions.length > 0 && (
          <div className="flex items-start gap-2">
            <AtSign className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Tagged</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {draft.mentions.map((userId) => (
                  <Badge key={userId} variant="secondary" className="text-xs">
                    @{userId}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Hashtags */}
        {draft.hashtags.length > 0 && (
          <div className="flex items-start gap-2">
            <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Hashtags</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {draft.hashtags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Location */}
        {draft.location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{draft.location.name}</span>
          </div>
        )}

        {/* Music */}
        {draft.musicClip && (
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {draft.musicClip.title} - {draft.musicClip.artist}
            </span>
          </div>
        )}

        {/* Link */}
        {draft.link && (
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate">{draft.link}</span>
          </div>
        )}

        {/* Interactive Stickers */}
        {draft.interactiveStickers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Interactive Stickers</p>
            <div className="flex flex-wrap gap-2">
              {draft.interactiveStickers.map((sticker) => {
                const StickerIcon = STICKER_ICONS[sticker.type];
                return (
                  <Badge key={sticker.id} variant="outline" className="gap-1">
                    <StickerIcon className="h-3 w-3" />
                    {sticker.type}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Applied */}
        {draft.filter && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Filter applied</Badge>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
          disabled={isPublishing}
          data-testid="button-back-to-privacy"
        >
          Back
        </Button>
        <Button
          onClick={onPublish}
          className="flex-1"
          disabled={isPublishing}
          data-testid="button-publish-story"
        >
          {isPublishing ? 'Publishing...' : 'Share Story'}
        </Button>
      </div>
    </div>
  );
}
