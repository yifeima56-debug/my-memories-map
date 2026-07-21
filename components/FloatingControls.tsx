'use client'

import { colors, microCopy } from '@/lib/theme'

interface FloatingControlsProps {
  onAddMemory: () => void
  viewMode: 'map' | 'list'
  onViewToggle: () => void
}

export default function FloatingControls({ onAddMemory, viewMode, onViewToggle }: FloatingControlsProps) {
  return (
    <div
      style={{
        position: 'fixed',
        right: '24px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Add Memory Button */}
      <button
        onClick={onAddMemory}
        className="group relative border-4 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden hover:scale-110 hover:rotate-6"
        style={{
          width: '56px',
          height: '56px',
          minWidth: '56px',
          backgroundColor: colors.pastelPink,
          borderColor: colors.border,
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <span className="text-2xl font-bold flex-shrink-0" style={{ color: colors.primary }}>+</span>

        {/* Hover hint - 向左展开 */}
        <span
          className="group-hover:opacity-100 group-hover:translate-x-0 absolute left-full ml-2 px-3 py-1 text-sm whitespace-nowrap rounded border-2 font-medium"
          style={{
            backgroundColor: colors.border,
            borderColor: colors.borderLight,
            color: colors.card,
            opacity: 0,
            transform: 'translateX(-8px)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: 'none',
          }}
        >
          {microCopy.addMemory}
        </span>
      </button>

      {/* View Toggle - 带展开文字动效 */}
      <button
        onClick={onViewToggle}
        className="group relative border-4 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden hover:scale-110"
        style={{
          width: '56px',
          height: '56px',
          minWidth: '56px',
          backgroundColor: colors.pastelBlue,
          borderColor: colors.border,
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <span className="text-2xl flex-shrink-0">
          {viewMode === 'map' ? '🗺️' : '📋'}
        </span>

        {/* Hover hint - 向左展开 */}
        <span
          className="group-hover:opacity-100 group-hover:translate-x-0 absolute left-full ml-2 px-3 py-1 text-sm whitespace-nowrap rounded border-2 font-medium"
          style={{
            backgroundColor: colors.border,
            borderColor: colors.borderLight,
            color: colors.card,
            opacity: 0,
            transform: 'translateX(-8px)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: 'none',
          }}
        >
          {viewMode === 'map' ? '回忆列表' : '地图模式'}
        </span>
      </button>
    </div>
  )
}