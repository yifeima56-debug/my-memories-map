// Supabase Storage upload service
// Uploads files directly to Supabase Storage bucket 'memories'

import { uploadFile as supabaseUploadFile } from '@/lib/supabaseClient'

export interface PresignedUrlResponse {
  url: string
  key: string
}

export interface UploadProgress {
  fileName: string
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  error?: string
  fallbackToLocal?: boolean
}

// Playful Chinese upload messages
const UPLOAD_MESSAGES = [
  '正在把回忆运到云端...',
  '正在教视频学会飞翔...',
  '把美好转换成字节...',
  '发给云端小精灵...',
  '正在加密你的小秘密...',
  '撒点数字魔力...',
  '打包美好回忆...',
  '马上就好啦...',
  '正在同步至云端...',
  '把美好打包中...',
  '回忆正在封存...',
]

// File size limit: 50MB for videos
const MAX_FILE_SIZE = 50 * 1024 * 1024

// Validate file - Support files up to 50MB for Supabase Storage
export function validateFile(file: File): { valid: boolean; error?: string } {
  const fileType = file.type
  const fileSize = file.size

  // Check file type
  if (!fileType.startsWith('image/') && !fileType.startsWith('video/')) {
    return {
      valid: false,
      error: '这不是照片或视频呢！试试看？📸🎬',
    }
  }

  // Check file size - limit to 50MB for Supabase free tier
  if (fileSize > MAX_FILE_SIZE) {
    const maxSizeMB = Math.round(MAX_FILE_SIZE / (1024 * 1024))
    return {
      valid: false,
      error: `视频太大了哦！最大 ${maxSizeMB}MB，建议先剪辑或使用「粘贴网络直链」功能。🎬`,
    }
  }

  return { valid: true }
}

// Mock function for backward compatibility - replaced with Supabase upload
export async function fetchPresignedUrl(fileName: string, fileType: string): Promise<PresignedUrlResponse> {
  return {
    url: fileName,
    key: fileName,
  }
}

// Direct upload to Supabase Storage (real implementation)
export async function uploadToS3(
  file: File,
  presignedUrl: string,
  onProgress: (progress: number) => void
): Promise<{ success: boolean; url?: string; fallbackUrl?: string; error?: string }> {
  try {
    // Simulate progress for better UX
    let progress = 0
    const progressInterval = setInterval(() => {
      if (progress < 90) {
        progress += Math.random() * 10
        onProgress(Math.min(progress, 90))
      }
    }, 200)

    // Upload to Supabase Storage
    const result = await supabaseUploadFile(file)

    clearInterval(progressInterval)
    onProgress(100)

    return {
      success: true,
      url: result.url,
    }
  } catch (error) {
    console.error('Supabase Storage upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败，请重试或使用网络直链',
    }
  }
}

// Create a local fallback URL immediately (for instant preview during upload)
export function createLocalFallbackUrl(file: File): string {
  return URL.createObjectURL(file)
}

// Get a random upload message
export function getRandomUploadMessage(): string {
  return UPLOAD_MESSAGES[Math.floor(Math.random() * UPLOAD_MESSAGES.length)]
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}