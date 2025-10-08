/**
 * Enhanced Create Story Dialog
 * Multi-step Instagram-like story creation flow
 * Inspired by Telegram's modular story editor architecture
 * 
 * Flow: Upload → Edit → Enhancements → Stickers → Privacy → Review
 * 
 * Telegram Inspirations:
 * - Ephemeral media handling (StoryProvider auto-save to localStorage)
 * - Contact-based privacy selector (AudiencePrivacyPanel)
 * - Modular editor panels with step navigation
 * - Multi-media queue system (MediaPickerPanel)
 * - Drag-and-drop overlay system (StoryEditorCanvas)
 * - Mention search with user previews (SocialEnhancementsPanel)
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/lib/auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { StoryProvider, useStoryDraft } from './story-context';
import { MediaPickerPanel } from './media-picker-panel';
import { StoryEditorCanvas } from './story-editor-canvas';
import { SocialEnhancementsPanel } from './social-enhancements-panel';
import { InteractiveStickerPanel } from './interactive-sticker-panel';
import { AudiencePrivacyPanel } from './audience-privacy-panel';
import { SummaryReviewPanel } from './summary-review-panel';

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'upload' | 'edit' | 'enhancements' | 'stickers' | 'privacy' | 'review';

const STEPS: Step[] = ['upload', 'edit', 'enhancements', 'stickers', 'privacy', 'review'];

const STEP_TITLES: Record<Step, string> = {
  upload: 'Add Media',
  edit: 'Edit Story',
  enhancements: 'Add Details',
  stickers: 'Interactive Stickers',
  privacy: 'Privacy Settings',
  review: 'Review & Share',
};

function CreateStoryDialogContent({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { draft, resetDraft } = useStoryDraft();
  const [currentStep, setCurrentStep] = useState<Step>('upload');

  const createStoryMutation = useMutation({
    mutationFn: async (data: any) => {
      // Generate a unique group ID for this upload session
      const groupId = `story-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a story for each media item
      const storyPromises = draft.mediaItems.map((mediaItem, index) => {
        const storyData = {
          mediaUrl: mediaItem.url,
          mediaType: mediaItem.type,
          groupId: groupId,
          sequenceNumber: index,
          canvasData: draft.canvasData,
          mentions: draft.mentions,
          hashtags: draft.hashtags,
          location: draft.location,
          musicClip: draft.musicClip,
          link: draft.link,
          privacy: draft.privacy,
          selectedViewers: draft.selectedViewers,
          interactiveStickers: draft.interactiveStickers,
        };

        return apiRequest('POST', '/api/stories', storyData);
      });

      // Wait for all stories to be created
      return Promise.all(storyPromises);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/stories'] });
      resetDraft();
      setCurrentStep('upload');
      onOpenChange(false);
      toast({
        title: 'Story published',
        description: `Your ${draft.mediaItems.length > 1 ? `${draft.mediaItems.length} stories have` : 'story has'} been shared successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to publish story',
        description: error.message || 'An error occurred while publishing your story',
      });
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !createStoryMutation.isPending) {
      // Auto-save is handled by StoryProvider
      setCurrentStep('upload');
      onOpenChange(false);
    }
  };

  const goToStep = (step: Step) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };

  const handlePublish = () => {
    if (draft.mediaItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No media',
        description: 'Please add at least one photo or video',
      });
      return;
    }

    createStoryMutation.mutate({});
  };

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  if (!user) return null;

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-create-story">
        <DialogHeader>
          <DialogTitle>{STEP_TITLES[currentStep]}</DialogTitle>
          <DialogDescription>
            Step {currentStepIndex + 1} of {STEPS.length}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <Progress value={progress} className="h-1" data-testid="progress-story-creation" />

        {/* Step Content with Animations */}
        <div className="flex-1 overflow-y-auto py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep === 'upload' && (
                <MediaPickerPanel onNext={nextStep} />
              )}
              {currentStep === 'edit' && (
                <StoryEditorCanvas onNext={nextStep} onBack={prevStep} />
              )}
              {currentStep === 'enhancements' && (
                <SocialEnhancementsPanel onNext={nextStep} onBack={prevStep} />
              )}
              {currentStep === 'stickers' && (
                <InteractiveStickerPanel onNext={nextStep} onBack={prevStep} />
              )}
              {currentStep === 'privacy' && (
                <AudiencePrivacyPanel onNext={nextStep} onBack={prevStep} />
              )}
              {currentStep === 'review' && (
                <SummaryReviewPanel
                  onBack={prevStep}
                  onPublish={handlePublish}
                  isPublishing={createStoryMutation.isPending}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Step Navigation Dots */}
        <div className="flex justify-center gap-2 py-2">
          {STEPS.map((step, idx) => (
            <button
              key={step}
              onClick={() => {
                // Allow navigation to completed steps
                if (idx <= currentStepIndex || draft.mediaItems.length > 0) {
                  goToStep(step);
                }
              }}
              className={`h-2 rounded-full transition-all ${
                idx === currentStepIndex
                  ? 'w-8 bg-primary'
                  : idx < currentStepIndex
                  ? 'w-2 bg-primary/50'
                  : 'w-2 bg-muted'
              }`}
              data-testid={`nav-dot-${step}`}
              aria-label={`Go to ${STEP_TITLES[step]}`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CreateStoryDialog({ open, onOpenChange }: CreateStoryDialogProps) {
  if (!open) return null;

  return (
    <StoryProvider>
      <CreateStoryDialogContent onOpenChange={onOpenChange} />
    </StoryProvider>
  );
}
