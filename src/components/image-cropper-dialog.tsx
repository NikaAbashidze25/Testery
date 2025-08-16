
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

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 50,
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
  
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspect) {
      const { width, height } = e.currentTarget;
      const initialCrop = centerAspectCrop(width, height, aspect);
      setCrop(initialCrop);
      setCompletedCrop(initialCrop);
    }
  }

  async function handleSaveCrop() {
    if (!completedCrop || !imgRef.current || !completedCrop.width || !completedCrop.height) {
        console.error("Crop or image not available");
        return;
    }

    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const canvas = document.createElement("canvas");
    const outputWidth = completedCrop.width * scaleX;
    const outputHeight = completedCrop.height * scaleY;

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("No 2D context");
    }

    ctx.beginPath();
    ctx.arc(outputWidth / 2, outputHeight / 2, Math.min(outputWidth, outputHeight) / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.save();
    ctx.translate(outputWidth / 2, outputHeight / 2);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-outputWidth / 2, -outputHeight / 2);

    ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        outputWidth,
        outputHeight
    );

    ctx.restore();

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
    );

    if (!blob) {
        console.error("Canvas is empty");
        return;
    }

    const file = new File([blob], "cropped-image.png", { type: "image/png" });
    onSave(file);
    onClose();
}
  
   const handleCropChange = (newCrop: Crop, percentCrop: Crop) => {
    setCrop(newCrop);
  };


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
                onChange={handleCropChange}
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
                  style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }}
                  className="max-h-[calc(80vh-200px)] object-contain"
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
                        defaultValue={[1]}
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
                        defaultValue={[0]}
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
