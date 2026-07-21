'use client'

import { useState, useEffect, useRef } from 'react'
import { colors, microCopy } from '@/lib/theme'

interface MemoryModalProps {
  memory: {
    id: string
    location: string
    caption: string
    date?: string
    authorId: string
    media: { type: 'image' | 'video'; url: string; creator_id?: string; caption?: string; is_external?: boolean }[]
  } | null
  onClose: () => void
  avatars?: { id: string; name: string }[]
  onEdit?: (memory: any) => void
  onDelete?: (id: string) => void
  isCurrentUser?: boolean
}

export default function MemoryModal({ memory, onClose, avatars = [], onEdit, onDelete, isCurrentUser = false }: MemoryModalProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [videoLoading, setVideoLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Get author name dynamically
  const authorName = memory?.authorId ? avatars.find(a => a.id === memory.authorId)?.name || '未知' : '未知'

  if (!memory) return null

  const nextMedia = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % memory.media.length)
  }

  const prevMedia = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + memory.media.length) % memory.media.length)
  }

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const minSwipeDistance = 50

    if (distance > minSwipeDistance) {
      nextMedia()
    } else if (distance < -minSwipeDistance) {
      prevMedia()
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevMedia()
      if (e.key === 'ArrowRight') nextMedia()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [memory])

  // Reset and play video when index changes
  useEffect(() => {
    setVideoLoading(true)
    if (videoRef.current) {
      videoRef.current.load()
      videoRef.current.play().catch(() => {})
    }
  }, [currentMediaIndex])

  // Video loading states
  const handleVideoLoadStart = () => {
    setVideoLoading(true)
  }

  const handleVideoCanPlay = () => {
    setVideoLoading(false)
  }

  const handleVideoLoadedData = () => {
    setVideoLoading(false)
  }

  const handleVideoError = () => {
    setVideoLoading(false)
    console.error('Video load error')
  }

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const currentMedia = memory.media[currentMediaIndex]
  const mediaCaption = currentMedia.caption || memory.caption
  const creatorName = currentMedia.creator_id ? avatars.find(a => a.id === currentMedia.creator_id)?.name || '未知' : authorName

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-0" onClick={onClose}>
      {/* Full-screen Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

      {/* Full-screen Lightbox Container */}
      <div
        ref={containerRef}
        className="relative w-full h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Media Display - Limited height */}
        <div className="flex items-center justify-center relative bg-black" style={{ minHeight: '300px', maxHeight: '60vh' }}>
          {currentMedia.type === 'image' ? (
            <img
              src={currentMedia.url}
              alt={mediaCaption}
              className="max-w-full max-h-[60vh] object-contain"
              draggable={false}
              loading="lazy"
            />
          ) : currentMedia.is_external && (currentMedia.url.includes('bilibili.com') || currentMedia.url.includes('youtube.com')) ? (
            // 外部视频平台使用 iframe
            <div className="w-full h-full" style={{ minHeight: '300px', maxHeight: '60vh' }}>
              <iframe
                src={currentMedia.url}
                className="w-full h-full"
                style={{ border: 'none', borderRadius: '8px' }}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          ) : (
            // 本地视频
            <>
              {videoLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white"></div>
                </div>
              )}
              <video
                ref={videoRef}
                src={currentMedia.url}
                autoPlay
                loop
                playsInline
                preload="metadata"
                controls
                controlsList="nodownload"
                className="max-w-full max-h-[60vh] object-contain"
                style={{
                  willChange: 'transform',
                  transform: 'translateZ(0)',
                  maxHeight: '60vh',
                  opacity: videoLoading ? 0.5 : 1,
                  transition: 'opacity 0.3s ease',
                }}
                onLoadStart={handleVideoLoadStart}
                onCanPlay={handleVideoCanPlay}
                onLoadedData={handleVideoLoadedData}
                onError={handleVideoError}
              />
            </>
          )}

          {/* Media Navigation Buttons */}
          {memory.media.length > 1 && (
            <>
              <button
                onClick={prevMedia}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-full flex items-center justify-center text-3xl text-white transition-all hover:bg-white/40 hover:scale-110 active:scale-95"
                aria-label="Previous"
              >
                ←
              </button>
              <button
                onClick={nextMedia}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-full flex items-center justify-center text-3xl text-white transition-all hover:bg-white/40 hover:scale-110 active:scale-95"
                aria-label="Next"
              >
                →
              </button>
            </>
          )}

          {/* Video indicator - 只显示本地视频，外部平台有自己的标识 */}
          {currentMedia.type === 'video' && !currentMedia.is_external && (
            <div className="absolute top-4 left-4 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm flex items-center gap-1">
              <span className="animate-pulse">●</span> Video
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-12 h-12 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-full flex items-center justify-center text-2xl text-white transition-all hover:bg-white/40 hover:scale-110 active:scale-95 z-10"
            aria-label="Close"
          >
            ✕
          </button>

          {/* Media indicators */}
          {memory.media.length > 1 && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-2">
              {memory.media.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentMediaIndex(i)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i === currentMediaIndex ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/70'
                  }`}
                  aria-label={`Go to media ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info Panel - Bottom Sheet */}
        <div className="bg-white border-t-4 p-6 space-y-4 max-h-[40vh] overflow-y-auto" style={{ borderColor: colors.border }}>
          {/* Location */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">📍</span>
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>
              {memory.location}
            </h2>
          </div>

          {/* Caption */}
          <p className="text-lg" style={{ color: colors.text }}>
            {mediaCaption}
          </p>

          {/* Meta info */}
          <div className="flex items-center justify-between pt-4 border-t-2" style={{ borderColor: colors.borderLight }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">👤</span>
              <span className="text-sm" style={{ color: colors.textLight }}>
                {creatorName}
              </span>
            </div>
            {memory.date && (
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <span className="text-sm" style={{ color: colors.textLight }}>
                  {memory.date}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xl">📷</span>
              <span className="text-sm" style={{ color: colors.textLight }}>
                {currentMediaIndex + 1} / {memory.media.length}
              </span>
            </div>
          </div>

          {/* Edit/Delete Buttons (only for current user) */}
          {isCurrentUser && (
            <div className="flex gap-3 pt-4 border-t-2" style={{ borderColor: colors.borderLight }}>
              <button
                onClick={() => {
                  onClose()
                  onEdit?.(memory)
                }}
                className="flex-1 py-3 border-3 rounded-xl font-medium transition-all hover:scale-105 hover:shadow-md"
                style={{
                  backgroundColor: colors.pastelBlue,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              >
                ✏️ 编辑
              </button>
              <button
                onClick={() => {
                  if (confirm('确定要删除这个回忆吗？此操作不可恢复。')) {
                    onClose()
                    onDelete?.(memory.id)
                  }
                }}
                className="flex-1 py-3 border-3 rounded-xl font-medium transition-all hover:scale-105 hover:shadow-md"
                style={{
                  backgroundColor: '#fee',
                  borderColor: '#fcc',
                  color: '#c00',
                }}
              >
                🗑️ 删除
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}