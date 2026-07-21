'use client'

import { useEffect, useState } from 'react'
import { colors } from '@/lib/theme'
import { getRandomUploadMessage } from '@/lib/s3-upload'

interface UploadProgressProps {
  fileName: string
  progress: number
  status: 'uploading' | 'complete' | 'error'
  error?: string
}

export default function UploadProgress({ fileName, progress, status, error }: UploadProgressProps) {
  const [message, setMessage] = useState('')
  const [emoji, setEmoji] = useState('🚀')

  useEffect(() => {
    setMessage(getRandomUploadMessage())
  }, [])

  // Update emoji based on progress
  useEffect(() => {
    if (status === 'complete') {
      setEmoji('✨')
      setMessage('你的回忆现在定格成历史啦！')
    } else if (status === 'error') {
      setEmoji('😅')
      setMessage('哎呀！云端小精灵懵圈了。')
    } else if (progress > 80) {
      setEmoji('🎉')
    } else if (progress > 50) {
      setEmoji('📤')
    }
  }, [progress, status])

  return (
    <div className="p-4 border-3 rounded-2xl space-y-3 animate-float" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
      {/* File name with emoji */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        <span className="text-sm font-medium truncate flex-1" style={{ color: colors.text }}>
          {fileName}
        </span>
      </div>

      {/* Progress bar */}
      {status === 'uploading' && (
        <>
          <div className="h-3 border-2 rounded-full overflow-hidden" style={{ borderColor: colors.borderLight }}>
            <div
              className="h-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: colors.primary,
              }}
            />
          </div>
          <div className="flex justify-between text-xs" style={{ color: colors.textLight }}>
            <span>{message}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </>
      )}

      {/* Complete state */}
      {status === 'complete' && (
        <div className="text-center py-2" style={{ color: colors.primary }}>
          <div className="text-3xl mb-1">✨</div>
          <div className="text-sm font-medium">{message}</div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="text-center py-2" style={{ color: '#E53E3E' }}>
          <div className="text-3xl mb-1">😅</div>
          <div className="text-sm">{error || message}</div>
        </div>
      )}
    </div>
  )
}