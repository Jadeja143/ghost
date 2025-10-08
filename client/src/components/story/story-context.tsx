/**
 * Story Draft Context Provider
 * Inspired by Telegram's ephemeral media state management
 * Manages story creation state with auto-save to localStorage
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StoryDraft, MediaItem } from '@shared/schema';

interface StoryContextType {
  draft: StoryDraft;
  updateDraft: (updates: Partial<StoryDraft>) => void;
  addMediaItem: (item: MediaItem) => void;
  removeMediaItem: (id: string) => void;
  setActiveMedia: (id: string) => void;
  resetDraft: () => void;
  saveDraft: () => void;
  loadDraft: () => void;
}

const StoryContext = createContext<StoryContextType | null>(null);

const DRAFT_KEY = 'story_draft_v1';

const getInitialDraft = (): StoryDraft => ({
  mediaItems: [],
  activeMediaId: null,
  canvasData: null,
  textOverlays: [],
  drawings: [],
  filter: undefined,
  mentions: [],
  hashtags: [],
  location: undefined,
  musicClip: undefined,
  link: undefined,
  privacy: 'public',
  selectedViewers: [],
  interactiveStickers: [],
});

export function StoryProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<StoryDraft>(getInitialDraft);

  // Auto-save to localStorage on draft changes (Telegram-inspired auto-save)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft.mediaItems.length > 0) {
        saveDraft();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [draft]);

  const updateDraft = (updates: Partial<StoryDraft>) => {
    setDraft(prev => ({ ...prev, ...updates }));
  };

  const addMediaItem = (item: MediaItem) => {
    setDraft(prev => ({
      ...prev,
      mediaItems: [...prev.mediaItems, item],
      activeMediaId: item.id,
    }));
  };

  const removeMediaItem = (id: string) => {
    setDraft(prev => {
      const newItems = prev.mediaItems.filter(item => item.id !== id);
      return {
        ...prev,
        mediaItems: newItems,
        activeMediaId: newItems.length > 0 ? newItems[0].id : null,
      };
    });
  };

  const setActiveMedia = (id: string) => {
    setDraft(prev => ({ ...prev, activeMediaId: id }));
  };

  const resetDraft = () => {
    setDraft(getInitialDraft());
    localStorage.removeItem(DRAFT_KEY);
  };

  const saveDraft = () => {
    try {
      // Don't save File objects to localStorage
      const serializableDraft = {
        ...draft,
        mediaItems: draft.mediaItems.map(item => ({
          ...item,
          file: undefined,
        })),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(serializableDraft));
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDraft(parsed);
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  };

  return (
    <StoryContext.Provider
      value={{
        draft,
        updateDraft,
        addMediaItem,
        removeMediaItem,
        setActiveMedia,
        resetDraft,
        saveDraft,
        loadDraft,
      }}
    >
      {children}
    </StoryContext.Provider>
  );
}

export function useStoryDraft() {
  const context = useContext(StoryContext);
  if (!context) {
    throw new Error('useStoryDraft must be used within StoryProvider');
  }
  return context;
}
