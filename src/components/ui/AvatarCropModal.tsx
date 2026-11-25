import * as Dialog from '@radix-ui/react-dialog'
import { useState, useRef, useEffect, useCallback } from 'react'
import { ZoomIn, ZoomOut, X } from 'lucide-react'
import { Button } from './Button'

export interface AvatarCropModalProps {
  isOpen: boolean
  imageSrc: string | null
  onClose: () => void
  onCropComplete: (croppedDataUrl: string) => void
}

const VIEWPORT_SIZE = 260
const OUTPUT_SIZE = 512

export function AvatarCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}: AvatarCropModalProps) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number }>({
    x: 0,
    y: 0,
    offsetX: 0,
    offsetY: 0,
  })
  const imgRef = useRef<HTMLImageElement>(null)

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    setNaturalSize({ width: naturalWidth, height: naturalHeight })
    setOffset({ x: 0, y: 0 })
    setZoom(1)
  }

  // Calculate base scale to fill the 260px circle
  const baseScale = naturalSize
    ? VIEWPORT_SIZE / Math.min(naturalSize.width, naturalSize.height)
    : 1
  const displayWidth = naturalSize ? naturalSize.width * baseScale * zoom : VIEWPORT_SIZE
  const displayHeight = naturalSize ? naturalSize.height * baseScale * zoom : VIEWPORT_SIZE

  // Clamp offset so the image doesn't expose empty space in the crop circle
  const clampOffset = useCallback(
    (x: number, y: number, currentZoom: number) => {
      if (!naturalSize) return { x: 0, y: 0 }
      const currentScale =
        (VIEWPORT_SIZE / Math.min(naturalSize.width, naturalSize.height)) * currentZoom
      const w = naturalSize.width * currentScale
      const h = naturalSize.height * currentScale
      const maxX = Math.max(0, (w - VIEWPORT_SIZE) / 2)
      const maxY = Math.max(0, (h - VIEWPORT_SIZE) / 2)
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      }
    },
    [naturalSize],
  )

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom)
    setOffset((prev) => clampOffset(prev.x, prev.y, newZoom))
  }

  const startDrag = (clientX: number, clientY: number) => {
    setIsDragging(true)
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    startDrag(e.clientX, e.clientY)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  useEffect(() => {
    const onMove = (clientX: number, clientY: number) => {
      if (!isDragging) return
      const dx = clientX - dragStartRef.current.x
      const dy = clientY - dragStartRef.current.y
      const rawX = dragStartRef.current.offsetX + dx
      const rawY = dragStartRef.current.offsetY + dy
      setOffset(clampOffset(rawX, rawY, zoom))
    }

    const handleMouseMove = (e: MouseEvent) => {
      onMove(e.clientX, e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        onMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const endDrag = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', endDrag)
      window.addEventListener('touchmove', handleTouchMove)
      window.addEventListener('touchend', endDrag)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', endDrag)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', endDrag)
    }
  }, [isDragging, zoom, clampOffset])

  const handleDone = () => {
    if (!naturalSize || !imgRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const factor = OUTPUT_SIZE / VIEWPORT_SIZE
    const finalW = displayWidth * factor
    const finalH = displayHeight * factor
    const finalX = (OUTPUT_SIZE - finalW) / 2 + offset.x * factor
    const finalY = (OUTPUT_SIZE - finalH) / 2 + offset.y * factor

    // Draw the circular cropped result
    ctx.drawImage(imgRef.current, finalX, finalY, finalW, finalH)

    // Export as WebP with JPEG fallback
    let dataUrl = canvas.toDataURL('image/webp', 0.88)
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.88)
    }
    onCropComplete(dataUrl)
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md transition-opacity duration-200" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[26px] border border-border bg-surface p-6 shadow-2xl focus:outline-none"
        >
          <div className="flex items-center justify-between pb-3">
            <div>
              <Dialog.Title className="text-h3 font-semibold text-text">Crop Photo</Dialog.Title>
              <p className="mt-0.5 text-caption text-muted">Drag to position and zoom to fit</p>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="icon-btn size-8 rounded-full text-muted hover:text-text hover:bg-surface-raised transition-colors"
                aria-label="Close crop modal"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Circular Crop Viewport */}
          <div className="my-4 flex items-center justify-center">
            <div
              className={`relative size-[260px] overflow-hidden rounded-full ring-2 ring-primary/80 shadow-inner select-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              } bg-surface-raised`}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              role="region"
              aria-label="Crop preview area. Click and drag to reposition image."
            >
              {imageSrc && (
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  draggable={false}
                  onLoad={handleImageLoad}
                  style={{
                    width: `${displayWidth}px`,
                    height: `${displayHeight}px`,
                    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    maxWidth: 'none',
                    maxHeight: 'none',
                  }}
                  className="pointer-events-none select-none transition-none"
                />
              )}
            </div>
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center gap-3 px-2 py-2">
            <ZoomOut className="size-4 text-muted shrink-0" aria-hidden />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              aria-label="Zoom photo"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-raised accent-primary focus:outline-none"
            />
            <ZoomIn className="size-4 text-muted shrink-0" aria-hidden />
          </div>

          {/* Action Buttons */}
          <div className="mt-5 flex items-center justify-end gap-2.5">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleDone}>
              Done
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
