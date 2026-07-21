'use client'

import { colors } from '@/lib/theme'

interface MemoryListProps {
  memories: {
    id: string
    location: string
    caption: string
    date?: string
    authorId: string
    media: { type: 'image' | 'video'; url: string; creator_id: string; caption: string }[]
  }[]
  onMemoryClick: (memory: any) => void
  avatars: { id: string; name: string }[]
}

export default function MemoryList({ memories, onMemoryClick, avatars }: MemoryListProps) {
  if (memories.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-8xl">👻</div>
          <p className="text-2xl font-bold" style={{ color: colors.text }}>
            No treasures yet.
          </p>
          <p className="text-lg" style={{ color: colors.textLight }}>
            Start dropping some pins!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-4 pb-20">
        {memories.map((memory) => (
          <button
            key={memory.id}
            onClick={() => onMemoryClick(memory)}
            className="w-full text-left border-4 rounded-2xl p-4 transition-all hover:scale-[1.02] hover:shadow-xl"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="flex gap-4">
              {/* Thumbnail */}
              <div className="w-24 h-24 flex-shrink-0 border-2 rounded-xl overflow-hidden" style={{ borderColor: colors.borderLight }}>
                {memory.media[0]?.type === 'image' ? (
                  <img src={memory.media[0].url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    🎬
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate" style={{ color: colors.text }}>
                  {memory.location}
                </h3>
                <p className="text-sm mt-1 line-clamp-2" style={{ color: colors.textLight }}>
                  {memory.caption}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: colors.textLight }}>
                  <span>👤 {avatars.find(a => a.id === memory.authorId)?.name || '未知'}</span>
                  {memory.date && <span>📅 {memory.date}</span>}
                  {memory.media.length > 1 && (
                    <span>📷 {memory.media.length}</span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center flex-shrink-0">
                <span className="text-2xl">→</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}