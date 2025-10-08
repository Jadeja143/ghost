/**
 * Media Picker Panel
 * Inspired by Telegram's multi-media story picker
 * Supports camera capture, gallery selection, and multi-item queue
 */

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Image as ImageIcon, X, Play } from 'lucide-react';
import { useStoryDraft } from './story-context';
import { MediaItem } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface MediaPickerPanelProps {
  onNext: () => void;
}

export function MediaPickerPanel({ onNext }: MediaPickerPanelProps) {
  const { draft, addMediaItem, removeMediaItem } = useStoryDraft();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (!isVideo && !isImage) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please select images or videos only',
        });
        continue;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const mediaItem: MediaItem = {
          id: `${Date.now()}-${Math.random()}`,
          url: reader.result as string,
          type: isVideo ? 'video' : 'image',
          file,
        };
        addMediaItem(mediaItem);
      };
      reader.readAsDataURL(file);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Camera access denied',
        description: 'Please allow camera access to capture photos',
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const mediaItem: MediaItem = {
            id: `${Date.now()}-${Math.random()}`,
            url,
            type: 'image',
          };
          addMediaItem(mediaItem);
          stopCamera();
        }
      }, 'image/jpeg');
    }
  };

  const canProceed = draft.mediaItems.length > 0;

  return (
    <div className="space-y-4" data-testid="panel-media-picker">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Add Media</h3>
        <p className="text-sm text-muted-foreground">
          Upload photos/videos or capture from camera
        </p>
      </div>

      {/* Camera View */}
      <AnimatePresence>
        {isCameraActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-lg overflow-hidden bg-black"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full aspect-[9/16] object-cover"
              data-testid="video-camera-preview"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <Button
                size="lg"
                onClick={capturePhoto}
                data-testid="button-capture-photo"
              >
                Capture
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={stopCamera}
                data-testid="button-stop-camera"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Options */}
      {!isCameraActive && (
        <div className="grid grid-cols-2 gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            data-testid="input-media-file"
          />
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-upload-from-gallery"
          >
            <ImageIcon className="h-6 w-6" />
            <span>Gallery</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={startCamera}
            data-testid="button-open-camera"
          >
            <Camera className="h-6 w-6" />
            <span>Camera</span>
          </Button>
        </div>
      )}

      {/* Media Queue - Telegram-inspired horizontal scroll */}
      {draft.mediaItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected Media ({draft.mediaItems.length})</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {draft.mediaItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative flex-shrink-0"
              >
                <div className="relative w-20 h-28 rounded-lg overflow-hidden bg-muted">
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      data-testid={`img-media-preview-${item.id}`}
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        data-testid={`video-media-preview-${item.id}`}
                      />
                      <Play className="absolute inset-0 m-auto h-6 w-6 text-white" />
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => removeMediaItem(item.id)}
                    data-testid={`button-remove-media-${item.id}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <Button
        className="w-full"
        onClick={onNext}
        disabled={!canProceed}
        data-testid="button-next-to-editor"
      >
        Next: Edit Story
      </Button>
    </div>
  );
}
