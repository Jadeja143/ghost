/**
 * Story Editor Canvas
 * Fabric.js-based canvas for editing stories
 * Inspired by Telegram's drag-and-drop overlay system
 * Supports: text overlays, drawing, stickers, filters
 */

import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { 
  Type, Pen, Eraser, Sparkles, Undo2, Redo2,
  Smile, Sticker as StickerIcon
} from 'lucide-react';
import { useStoryDraft } from './story-context';
import { motion } from 'framer-motion';
import { ChromePicker } from 'react-color';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface StoryEditorCanvasProps {
  onNext: () => void;
  onBack: () => void;
}

type Tool = 'select' | 'text' | 'draw' | 'eraser' | 'sticker';

const FILTERS = [
  { name: 'Normal', filter: '' },
  { name: 'Grayscale', filter: 'grayscale(100%)' },
  { name: 'Sepia', filter: 'sepia(100%)' },
  { name: 'Brightness', filter: 'brightness(120%)' },
  { name: 'Contrast', filter: 'contrast(120%)' },
  { name: 'Blur', filter: 'blur(2px)' },
];

export function StoryEditorCanvas({ onNext, onBack }: StoryEditorCanvasProps) {
  const { draft, updateDraft } = useStoryDraft();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(5);
  const [selectedFilter, setSelectedFilter] = useState('');
  const [textInput, setTextInput] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const activeMedia = draft.mediaItems.find(item => item.id === draft.activeMediaId);

  useEffect(() => {
    if (!canvasRef.current || !activeMedia) return;

    // Initialize Fabric.js canvas (Telegram-inspired setup)
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 400,
      height: 700,
      backgroundColor: '#000000',
    });

    fabricCanvasRef.current = canvas;

    // Load media as background
    if (activeMedia.type === 'image') {
      fabric.Image.fromURL(activeMedia.url, {}, (img: fabric.Image | null) => {
        if (!img) return;
        const scale = Math.min(
          canvas.width! / (img.width || 1),
          canvas.height! / (img.height || 1)
        );
        img.scale(scale);
        img.set({
          left: (canvas.width! - (img.width || 0) * scale) / 2,
          top: (canvas.height! - (img.height || 0) * scale) / 2,
          selectable: false,
          evented: false,
        });
        (canvas as any).setBackgroundImage(img, canvas.renderAll.bind(canvas));
      });
    }

    // Load saved canvas data if exists
    if (draft.canvasData) {
      canvas.loadFromJSON(draft.canvasData, () => {
        canvas.renderAll();
      });
    }

    return () => {
      canvas.dispose();
    };
  }, [activeMedia?.id]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Configure canvas based on active tool
    canvas.isDrawingMode = activeTool === 'draw' || activeTool === 'eraser';
    
    if (canvas.isDrawingMode && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = activeTool === 'eraser' ? '#000000' : drawColor;
      canvas.freeDrawingBrush.width = brushSize;
    }
  }, [activeTool, drawColor, brushSize]);

  const addText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !textInput.trim()) return;

    // Telegram-inspired text bubble
    const text = new fabric.IText(textInput, {
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      fontSize: 32,
      fill: drawColor,
      fontFamily: 'Arial',
      originX: 'center',
      originY: 'center',
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    setTextInput('');
    saveCanvas();
  };

  const addEmoji = (emoji: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const text = new fabric.Text(emoji, {
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      fontSize: 64,
      originX: 'center',
      originY: 'center',
    });

    canvas.add(text);
    canvas.renderAll();
    saveCanvas();
  };

  const applyFilter = (filter: string) => {
    setSelectedFilter(filter);
    updateDraft({ filter });
  };

  const saveCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const json = canvas.toJSON();
    updateDraft({ canvasData: json });
  };

  const undo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const objects = canvas.getObjects();
    if (objects.length > 0) {
      canvas.remove(objects[objects.length - 1]);
      canvas.renderAll();
      saveCanvas();
    }
  };

  const clearAll = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    canvas.getObjects().forEach((obj: any) => {
      if (obj !== canvas.backgroundImage) {
        canvas.remove(obj);
      }
    });
    canvas.renderAll();
    saveCanvas();
  };

  return (
    <div className="space-y-4" data-testid="panel-story-editor">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Edit Story</h3>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            data-testid="button-undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            data-testid="button-clear-all"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative mx-auto"
        style={{ maxWidth: '400px' }}
      >
        <canvas
          ref={canvasRef}
          className="border rounded-lg"
          style={{ filter: selectedFilter }}
          data-testid="canvas-story-editor"
        />
      </motion.div>

      {/* Filter Selector */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Filters</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {FILTERS.map((filter) => (
            <Button
              key={filter.name}
              variant={selectedFilter === filter.filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyFilter(filter.filter)}
              data-testid={`button-filter-${filter.name.toLowerCase()}`}
            >
              {filter.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Tool Selection */}
      <div className="flex gap-2 justify-center">
        <Button
          variant={activeTool === 'text' ? 'default' : 'outline'}
          size="icon"
          onClick={() => setActiveTool('text')}
          data-testid="button-tool-text"
        >
          <Type className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === 'draw' ? 'default' : 'outline'}
          size="icon"
          onClick={() => setActiveTool('draw')}
          data-testid="button-tool-draw"
        >
          <Pen className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === 'eraser' ? 'default' : 'outline'}
          size="icon"
          onClick={() => setActiveTool('eraser')}
          data-testid="button-tool-eraser"
        >
          <Eraser className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === 'sticker' ? 'default' : 'outline'}
          size="icon"
          onClick={() => setActiveTool('sticker')}
          data-testid="button-tool-sticker"
        >
          <Smile className="h-4 w-4" />
        </Button>
        <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              data-testid="button-color-picker"
            >
              <div
                className="w-4 h-4 rounded-full border"
                style={{ backgroundColor: drawColor }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <ChromePicker
              color={drawColor}
              onChange={(color) => setDrawColor(color.hex)}
              disableAlpha
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Tool Options */}
      {activeTool === 'text' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2"
        >
          <Input
            placeholder="Enter text..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addText()}
            data-testid="input-text-overlay"
          />
          <Button onClick={addText} data-testid="button-add-text">
            Add
          </Button>
        </motion.div>
      )}

      {activeTool === 'draw' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-sm">Brush Size: {brushSize}px</p>
          <Slider
            value={[brushSize]}
            onValueChange={([value]) => setBrushSize(value)}
            min={1}
            max={20}
            step={1}
            data-testid="slider-brush-size"
          />
        </motion.div>
      )}

      {activeTool === 'sticker' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 flex-wrap"
        >
          {['😀', '❤️', '🔥', '👍', '🎉', '😍', '🌟', '✨'].map((emoji) => (
            <Button
              key={emoji}
              variant="outline"
              onClick={() => addEmoji(emoji)}
              className="text-2xl"
              data-testid={`button-emoji-${emoji}`}
            >
              {emoji}
            </Button>
          ))}
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
          data-testid="button-back-to-media"
        >
          Back
        </Button>
        <Button
          onClick={() => {
            saveCanvas();
            onNext();
          }}
          className="flex-1"
          data-testid="button-next-to-enhancements"
        >
          Next: Add Details
        </Button>
      </div>
    </div>
  );
}
