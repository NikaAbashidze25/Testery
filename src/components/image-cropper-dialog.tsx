'use client';

import { useState, useRef, useEffect } from 'react';
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

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
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

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotate(0);
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  }, [isOpen]);
  
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspect) {
      const { width, height } = e.currentTarget;
      const newCrop = centerAspectCrop(width, height, aspect);
      setCrop(newCrop);
      setCompletedCrop(newCrop);
    }
  }

  async function handleSaveCrop() {
    const image = imgRef.current;
    if (!completedCrop || !image) {
      console.error("Crop or image not available.");
      return;
    }
    // A crop is not valid if it has no area.
    if (completedCrop.width === 0 || completedCrop.height === 0) {
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }
    
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // devicePixelRatio slightly increases sharpness on retina displays
    // but can be removed if strange scaling issues occur.
    const pixelRatio = window.devicePixelRatio;

    canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';
    
    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;

    const rotateRads = (rotate * Math.PI) / 180;
    const centerX = image.naturalWidth / 2;
    const centerY = image.naturalHeight / 2;

    ctx.save();
    
    // 5) Move the cropped area to the center of the canvas
    ctx.translate(-cropX, -cropY);
    // 4) Move the origin to the center of the original position
    ctx.translate(centerX, centerY);
    // 3) Rotate the entire canvas desired angle
    ctx.rotate(rotateRads);
    // 2) Scale the canvas
    ctx.scale(scale, scale);
    // 1) Move the origin back to the top left corner of the image
    ctx.translate(-centerX, -centerY);

    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight
    );

    ctx.restore();
    
    // Create a new canvas to draw the circular clip
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');

    if (!finalCtx) {
      throw new Error('No 2d context for final canvas');
    }

    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;

    // Create a circular clipping path.
    finalCtx.beginPath();
    finalCtx.arc(finalCanvas.width / 2, finalCanvas.height / 2, Math.min(finalCanvas.width, finalCanvas.height) / 2, 0, Math.PI * 2);
    finalCtx.closePath();
    finalCtx.clip();
    
    finalCtx.drawImage(canvas, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
        finalCanvas.toBlob(resolve, 'image/png', 1)
    );

    if (!blob) {
        console.error('Canvas is empty');
        return;
    }

    const file = new File([blob], 'cropped-image.png', { type: 'image/png' });
    onSave(file);
    onClose();
}


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Crop and Edit Your Image</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-6 items-start overflow-y-auto p-6">
            <div className="flex justify-center items-center bg-muted/30 rounded-md h-full w-full">
              <ReactCrop
                crop={crop}
                onChange={(c, percentCrop) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                circularCrop={true}
                keepSelection={true}
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imageSrc}
                  onLoad={onImageLoad}
                  className="max-h-[calc(80vh-200px)] object-contain"
                  style={{
                    transform: `scale(${scale}) rotate(${rotate}deg)`,
                  }}
                />
              </ReactCrop>
            </div>
            <div className="space-y-8 md:pt-4">
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label htmlFor="scale-slider" className="text-sm font-medium">Zoom</label>
                        <span className="text-sm text-muted-foreground w-12 text-right">{(scale * 100).toFixed(0)}%</span>
                    </div>
                    <Slider
                        id="scale-slider"
                        value={[scale]}
                        min={0.5}
                        max={3}
                        step={0.01}
                        onValueChange={(value) => setScale(value[0])}
                    />
                </div>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label htmlFor="rotate-slider" className="text-sm font-medium">Rotate</label>
                         <span className="text-sm text-muted-foreground w-12 text-right">{rotate.toFixed(0)}°</span>
                    </div>
                    <Slider
                        id="rotate-slider"
                        value={[rotate]}
                        min={-180}
                        max={180}
                        step={1}
                        onValueChange={(value) => setRotate(value[0])}
                    />
                </div>
            </div>
        </div>
        
        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveCrop}>Save and Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
