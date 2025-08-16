'use client';

import { useState, useRef } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface ImageCropperDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onSave: (file: File) => void;
}

// Helper to center the crop area
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropperDialog({
  isOpen,
  onClose,
  imageSrc,
  onSave,
}: ImageCropperDialogProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  }

  async function handleSaveCrop() {
    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    if (!image || !canvas || !completedCrop) {
      throw new Error('Crop details not available');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    const offscreen = new OffscreenCanvas(
        completedCrop.width * scaleX,
        completedCrop.height * scaleY
    );
    const ctx = offscreen.getContext('2d');
    if (!ctx) {
        throw new Error('No 2d context');
    }

    ctx.drawImage(
        image,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight
    );
    
    // Set the destination canvas size
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    const finalCtx = canvas.getContext('2d');
    if (!finalCtx) {
        throw new Error('No 2d context for final canvas');
    }
    
    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;
    
    finalCtx.save();
    finalCtx.translate(canvas.width / 2, canvas.height / 2);
    finalCtx.rotate(rotate * Math.PI / 180);
    finalCtx.scale(scale, scale);
    finalCtx.translate(-canvas.width / 2, -canvas.height / 2);
    finalCtx.drawImage(
        image,
        cropX,
        cropY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY
    );
    finalCtx.restore();

    canvas.toBlob((blob) => {
        if (!blob) {
            console.error('Canvas is empty');
            return;
        }
        const file = new File([blob], 'cropped-image.png', { type: 'image/png' });
        onSave(file);
        onClose();
    }, 'image/png');
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Crop and Edit Your Image</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-6 items-start max-h-[75vh]">
            <div className="flex justify-center items-center bg-muted/30 rounded-md p-4 h-[calc(75vh-100px)] overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                circularCrop={true}
                keepSelection={true}
                minHeight={100}
                minWidth={100}
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imageSrc}
                  style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }}
                  onLoad={onImageLoad}
                  className="max-w-full max-h-[calc(75vh-150px)] object-contain"
                />
              </ReactCrop>
            </div>
            <div className="space-y-8 md:pt-4">
                <div className="space-y-2">
                    <label htmlFor="scale-slider" className="text-sm font-medium">Zoom</label>
                    <Slider
                        id="scale-slider"
                        defaultValue={[1]}
                        min={0.5}
                        max={3}
                        step={0.01}
                        onValueChange={(value) => setScale(value[0])}
                    />
                </div>
                 <div className="space-y-2">
                    <label htmlFor="rotate-slider" className="text-sm font-medium">Rotate</label>
                    <Slider
                        id="rotate-slider"
                        defaultValue={[0]}
                        min={-180}
                        max={180}
                        step={1}
                        onValueChange={(value) => setRotate(value[0])}
                    />
                </div>
            </div>
        </div>

        {!!completedCrop && (
            <canvas
              ref={previewCanvasRef}
              style={{
                display: 'none',
                objectFit: 'contain',
                width: completedCrop.width,
                height: completedCrop.height,
              }}
            />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveCrop}>Save and Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
