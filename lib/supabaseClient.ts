import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pscappeeldsrmzjwwipk.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzY2FwcGVlbGRzcm16and3aXBraSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzg0NTUzODAsImV4cCI6MjEwMDEzMTM4MH0.iSz0UCgqmLjhx0WE4Fhhru47gVqVVsFUARhncMxkp50'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Storage bucket name
const STORAGE_BUCKET = 'our Europe memories'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// 支持的视频格式
const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime', // mov
  'video/x-msvideo', // avi
  'video/x-matroska', // mkv
  'video/3gpp', // 手机录制常见格式
  'video/3gpp2', // 3G2 格式
]

// 检测是否为移动设备
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Database types
export interface Memory {
  id?: string
  lat: number
  lng: number
  location: string
  caption: string
  date?: string
  author_id: string
  media: {
    type: 'image' | 'video'
    url: string
    creator_id: string
    caption?: string
    is_external?: boolean
  }[]
  created_at?: string
  updated_at?: string
}

export interface Avatar {
  id: string
  name: string
  image: string
  color: string
  status_text?: string
  created_at?: string
}

export interface Comment {
  id?: string
  memory_id: string
  author_id: string
  content: string
  created_at?: string
}

// Table names
export const TABLES = {
  MEMORIES: 'memories',
  AVATARS: 'avatars',
} as const

// Upload file to Supabase Storage
export const uploadFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ url: string; path: string }> => {
  console.log('=== 开始上传到 Supabase Storage ===')
  console.log('存储桶:', STORAGE_BUCKET)

  // 验证文件大小
  if (file.size > MAX_FILE_SIZE) {
    const errorMsg = `文件大小超过 ${MAX_FILE_SIZE / 1024 / 1024 }MB 限制`
    console.error('上传失败:', errorMsg)
    throw new Error(errorMsg)
  }

  // 验证文件类型
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    const errorMsg = '不支持的文件类型，仅支持图片和视频'
    console.error('上传失败:', errorMsg)
    throw new Error(errorMsg)
  }

  // 验证视频格式
  if (file.type.startsWith('video/')) {
    if (!SUPPORTED_VIDEO_TYPES.includes(file.type)) {
      const errorMsg = `不支持的视频格式: ${file.type}。支持: ${SUPPORTED_VIDEO_TYPES.join(', ')}`
      console.error('上传失败:', errorMsg)
      throw new Error(errorMsg)
    }
  }

  // 编码文件名以确保 URL 安全
  const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\s+/g, '_')}`
  const filePath = `uploads/${safeFileName}`

  console.log('文件路径:', filePath)
  console.log('文件信息:', { name: file.name, type: file.type, size: file.size })

  // 视频文件特殊处理 - 打印更多调试信息
  if (file.type.startsWith('video/')) {
    console.log('=== 检测到视频文件 ===')
    console.log('视频 MIME 类型:', file.type)
    console.log('文件大小:', `${(file.size / 1024 / 1024).toFixed(2)}MB`)
    console.log('支持的视频格式: mp4, webm, ogg, mov, avi, mkv, 3gp')

    // 检测设备类型
    const mobile = isMobileDevice()
    console.log('设备类型:', mobile ? '移动设备' : '桌面设备')

    // 移动设备提示更长的上传时间
    if (mobile) {
      console.log('⚠️ 移动设备上传较慢，请保持网络连接，预计需要 30-120 秒')
    } else {
      console.log('预计上传时间:', `${(file.size / 1024 / 1024).toFixed(2)}MB 可能需要 10-60 秒，请耐心等待...`)
    }
  }

  try {
    // 根据文件大小调整缓存时间（视频文件缓存更久）
    const cacheTime = file.type.startsWith('video/') ? '86400' : '3600'

    console.log('=== 开始上传 ===')
    console.log('缓存时间:', `${cacheTime}s`)
    console.log('使用存储桶:', STORAGE_BUCKET)
    console.log('网络状态:', navigator.onLine ? '在线' : '离线')

    // 移动设备增加超时时间
    const isMobile = isMobileDevice()
    const timeoutMs = isMobile && file.type.startsWith('video/') ? 10 * 60 * 1000 : 5 * 60 * 1000

    console.log('超时设置:', `${timeoutMs / 1000 / 60} 分钟`)

    // 启动模拟进度（Supabase 客户端不支持实时进度）
    let progressInterval: NodeJS.Timeout
    if (onProgress) {
      let simulatedProgress = 10
      onProgress(simulatedProgress)

      // 移动设备进度更慢（每 2 秒 +1%），桌面设备每秒 +2%
      const increment = isMobile ? 1 : 2
      const interval = isMobile ? 2000 : 1000

      progressInterval = setInterval(() => {
        simulatedProgress += increment
        if (simulatedProgress < 90) {
          onProgress(simulatedProgress)
        }
      }, interval)
    }

    // 设置超时
    const uploadPromise = supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: cacheTime,
        upsert: false,
        contentType: file.type,
      })

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(isMobile ? '移动设备上传超时，请检查网络后重试' : '上传超时，请检查网络后重试')), timeoutMs)
    })

    const { data, error } = await Promise.race([uploadPromise, timeoutPromise]) as any

    // 清除进度模拟
    if (progressInterval) {
      clearInterval(progressInterval)
    }

    if (error) {
      console.error('=== Supabase Storage 上传错误 ===')
      console.error('Error Message:', error.message)
      console.error('Error Code:', error.statusCode || 'N/A')
      console.error('Error Name:', error.name || 'N/A')
      console.error('完整 Error 对象:', JSON.stringify(error, null, 2))

      // 根据错误代码提供更友好的错误信息
      const mobile = isMobileDevice()
      let userMessage = '上传失败，请重试或使用网络直链'

      if (error.statusCode === 401) {
        userMessage = '认证失败，请检查 Supabase 密钥配置'
      } else if (error.statusCode === 403) {
        userMessage = '没有权限上传到此存储桶，请检查 RLS 策略'
      } else if (error.statusCode === 404) {
        userMessage = `存储桶 "${STORAGE_BUCKET}" 不存在，请在 Supabase 控制台创建`
      } else if (error.message?.includes('Bucket not found')) {
        userMessage = `存储桶 "${STORAGE_BUCKET}" 不存在`
      } else if (error.message?.includes('duplicate')) {
        userMessage = '文件已存在，请重试'
      } else if (error.message?.includes('timeout') || error.message?.includes('超时')) {
        if (mobile) {
          userMessage = '移动设备上传超时，请切换到更稳定的网络（WiFi）后重试'
        } else {
          userMessage = '上传超时，网络可能不稳定，请重试'
        }
      } else if (error.statusCode === 413) {
        userMessage = '文件太大，请压缩后重试'
      } else if (error.message?.includes('network') || error.message?.includes('Network')) {
        if (mobile) {
          userMessage = '网络连接不稳定，请检查信号后重试'
        } else {
          userMessage = '网络错误，请重试'
        }
      } else if (error.message) {
        userMessage = `上传失败: ${error.message}`
      }

      throw new Error(userMessage)
    }

    console.log('✅ 上传成功:', data)

    // 获取公共 URL
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath)

    console.log('公共 URL:', publicUrlData.publicUrl)

    // 最终进度 100%
    if (onProgress) {
      onProgress(100)
    }

    return {
      url: publicUrlData.publicUrl,
      path: filePath,
    }
  } catch (error: any) {
    console.error('=== 上传异常 ===')
    console.error('Error Name:', error?.name || 'Unknown')
    console.error('Error Message:', error?.message || 'No message')
    console.error('Error Stack:', error?.stack || 'No stack')
    console.error('完整 Error 对象:', JSON.stringify(error, null, 2))

    const userMessage = error?.message || '上传失败，请重试或使用网络直链'
    throw new Error(userMessage)
  }
}

// Delete file from Supabase Storage
export const deleteFile = async (path: string): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path])

    if (error) {
      console.error('Supabase Storage delete error:', error)
    }
  } catch (error) {
    console.error('Delete file error:', error)
  }
}

// Real-time subscriptions
export const subscribeToMemories = (
  callback: (memories: Memory[]) => void
) => {
  const channel = supabase
    .channel('memories_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'memories' },
      () => fetchMemories().then(callback)
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Fetch all memories
export const fetchMemories = async (): Promise<Memory[]> => {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching memories:', error)
    return []
  }

  return data || []
}

// Create memory
export const createMemory = async (memory: Omit<Memory, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('memories')
    .insert([memory])
    .select()
    .single()

  if (error) {
    console.error('Error creating memory:', error)
    throw error
  }

  return data
}

// Update memory
export const updateMemory = async (id: string, updates: Partial<Omit<Memory, 'id' | 'created_at'>>) => {
  const { data, error } = await supabase
    .from('memories')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating memory:', error)
    throw error
  }

  return data
}

// Delete memory
export const deleteMemory = async (id: string) => {
  // 首先获取回忆信息以删除关联的文件
  const { data: memory } = await supabase
    .from('memories')
    .select('media')
    .eq('id', id)
    .single()

  if (memory?.media) {
    // 删除所有关联的文件
    for (const media of memory.media) {
      if (media.url && !media.is_external) {
        // 从 URL 中提取文件路径
        const pathMatch = media.url.match(/\/uploads\/(.+)$/)
        if (pathMatch) {
          const filePath = `uploads/${pathMatch[1]}`
          await deleteFile(filePath)
        }
      }
    }
  }

  // 删除数据库记录
  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting memory:', error)
    throw error
  }
}

// Fetch avatars
export const fetchAvatars = async (): Promise<Avatar[]> => {
  const { data, error } = await supabase
    .from('avatars')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching avatars:', error)
    return []
  }

  return data || []
}

// Create avatar
export const createAvatar = async (avatar: Omit<Avatar, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('avatars')
    .insert([avatar])
    .select()
    .single()

  if (error) {
    console.error('Error creating avatar:', error)
    throw error
  }

  return data
}

// Update avatar
export const updateAvatar = async (id: string, updates: Partial<Omit<Avatar, 'id' | 'created_at'>>) => {
  const { data, error } = await supabase
    .from('avatars')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating avatar:', error)
    throw error
  }

  return data
}

// Delete avatar
export const deleteAvatar = async (id: string) => {
  const { error } = await supabase
    .from('avatars')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting avatar:', error)
    throw error
  }
}

// ===== Comments Functions =====

// Fetch comments for a specific memory
export const fetchComments = async (memoryId: string): Promise<Comment[]> => {
  console.log('Fetching comments for memoryId:', memoryId)
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('memory_id', memoryId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', JSON.stringify(error, null, 2))
      return []
    }

    return data || []
  } catch (err) {
    console.error('Unexpected error fetching comments:', JSON.stringify(err, null, 2))
    return []
  }
}

// Create comment
export const createComment = async (comment: Omit<Comment, 'id' | 'created_at'>) => {
  console.log('Creating comment with data:', comment)
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert([comment])
      .select()
      .single()

    if (error) {
      console.error('Error creating comment:', JSON.stringify(error, null, 2))
      throw error
    }

    return data
  } catch (err) {
    console.error('Unexpected error creating comment:', JSON.stringify(err, null, 2))
    throw err
  }
}

// Delete comment
export const deleteComment = async (id: string) => {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting comment:', error)
    throw error
  }
}

// Subscribe to comments for a memory
export const subscribeToComments = (
  memoryId: string,
  callback: (comments: Comment[]) => void
) => {
  try {
    const channel = supabase
      .channel('comments_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `memory_id=eq.${memoryId}` },
        () => fetchComments(memoryId).then(callback)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  } catch (err) {
    console.error('Error setting up comment subscription:', err)
    return () => {}
  }
}
