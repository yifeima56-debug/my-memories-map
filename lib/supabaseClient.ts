import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pscappeeldsrmzjwwipk.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_dyLT7gqLQedKGr_CpuV28w_tFIi5NOu'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Storage bucket name
const STORAGE_BUCKET = 'our Europe memories'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

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
  id?: string
  name: string
  image: string
  color: string
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
  // 验证文件大小
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`文件大小超过 ${MAX_FILE_SIZE / 1024 / 1024 }MB 限制`)
  }

  // 验证文件类型
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    throw new Error('不支持的文件类型，仅支持图片和视频')
  }

  // 编码文件名以确保 URL 安全
  const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\s+/g, '_')}`
  const filePath = `uploads/${safeFileName}`

  try {
    console.log('开始上传到存储桶:', STORAGE_BUCKET)
    console.log('文件路径:', filePath)
    console.log('文件信息:', { name: file.name, type: file.type, size: file.size })

    // 上传到 Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      console.error('Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        name: error.name
      })
      throw error
    }

    console.log('上传成功:', data)

    // 获取公共 URL
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath)

    // 如果有进度回调，模拟上传进度（Supabase 客户端不支持实时进度）
    if (onProgress) {
      onProgress(100)
    }

    return {
      url: publicUrlData.publicUrl,
      path: filePath,
    }
  } catch (error) {
    console.error('Supabase Storage upload error:', error)
    throw new Error('上传失败，请重试或使用网络直链')
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