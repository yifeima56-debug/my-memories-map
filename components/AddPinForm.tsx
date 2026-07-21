'use client'

import { useRef, useState, useEffect } from 'react'
import { colors, microCopy } from '@/lib/theme'
import { uploadFile } from '@/lib/supabaseClient'

interface UploadProgressState {
  fileName: string
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  error?: string
  file: File
  url?: string
  path?: string
}

interface ExternalMedia {
  url: string
  type: 'image' | 'video'
  platform?: 'bilibili' | 'youtube' | 'direct'
  bvid?: string
  youtubeId?: string
}

interface AddPinFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    location: { lat: number; lng: number }
    cityName: string
    media: { file: File; url: string; path?: string; isExternal?: boolean }[]
    caption: string
  }) => void
  initialLocation?: { lat: number; lng: number }
  onLocationSearch?: (lat: number, lng: number) => void
  editingMemory?: {
    id: string
    location: string
    caption: string
    media: { type: 'image' | 'video'; url: string; is_external?: boolean }[]
    lat?: number
    lng?: number
  }
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function AddPinForm({
  isOpen,
  onClose,
  onSubmit,
  initialLocation,
  onLocationSearch,
  editingMemory,
}: AddPinFormProps) {
  const [caption, setCaption] = useState('')
  const [mediaFiles, setMediaFiles] = useState<UploadProgressState[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchedLocation, setSearchedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [searchedCityName, setSearchedCityName] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [externalMedia, setExternalMedia] = useState<ExternalMedia[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initialLocationRef = useRef<{ lat: number; lng: number } | null>(null)

  // 初始化编辑模式
  useEffect(() => {
    if (editingMemory) {
      setCaption(editingMemory.caption)
      setSearchQuery(editingMemory.location)
      setSearchedCityName(editingMemory.location)

      // 初始化位置（如果编辑记忆有经纬度）
      if (editingMemory.lat !== undefined && editingMemory.lng !== undefined) {
        setSearchedLocation({ lat: editingMemory.lat, lng: editingMemory.lng })
      }

      // 加载现有媒体
      const existingMedia: ExternalMedia[] = []
      for (const media of editingMemory.media) {
        if (media.is_external) {
          existingMedia.push({
            url: media.url,
            type: media.type,
            platform: detectPlatform(media.url),
          })
        }
      }
      setExternalMedia(existingMedia)
    }
  }, [editingMemory])

  // 重置表单
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSearchedLocation(null)
      setSearchedCityName('')
      setCaption('')
      setMediaFiles([])
      setExternalMedia([])
      setExternalUrl('')
      initialLocationRef.current = null
    }
  }, [isOpen])

  // 反向地理编码
  useEffect(() => {
    if (initialLocation &&
        initialLocation.lat !== undefined &&
        initialLocation.lng !== undefined &&
        JSON.stringify(initialLocation) !== JSON.stringify(initialLocationRef.current)) {
      reverseGeocode(initialLocation.lat, initialLocation.lng)
      initialLocationRef.current = initialLocation
    }
  }, [initialLocation])

  if (!isOpen) return null

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=zh-CN`
      )
      const result = await response.json()

      if (result && result.display_name) {
        const parts = result.display_name.split(',')
        const conciseName = parts.slice(0, 3).join(',').trim()
        setSearchQuery(conciseName)
        setSearchedCityName(conciseName)
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error)
    }
  }

  const detectPlatform = (url: string): 'bilibili' | 'youtube' | 'direct' => {
    if (url.includes('bilibili.com')) return 'bilibili'
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
    return 'direct'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    await processFiles(files)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    await processFiles(files)
  }

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // 检查文件类型
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return { valid: false, error: '不支持的文件类型' }
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `文件大小超过 ${MAX_FILE_SIZE / 1024 / 1024}MB 限制` }
    }

    return { valid: true }
  }

  const processFiles = async (files: File[]) => {
    if (isUploading) return

    const validFiles = files.filter(file => {
      const validation = validateFile(file)
      if (!validation.valid) {
        alert(`文件 "${file.name}"：${validation.error}`)
      }
      return validation.valid
    })

    // 添加文件到上传队列
    setMediaFiles((prev) => [
      ...prev,
      ...validFiles.map((file) => ({
        fileName: file.name,
        progress: 0,
        status: 'pending' as const,
        file,
      })),
    ])

    // 开始上传文件
    setIsUploading(true)
    for (const file of validFiles) {
      try {
        // 更新状态为上传中
        setMediaFiles((prev) =>
          prev.map((item) =>
            item.fileName === file.name
              ? { ...item, status: 'uploading' as const, progress: 50 }
              : item
          )
        )

        // 上传到 Supabase Storage
        const result = await uploadFile(file, (progress) => {
          setMediaFiles((prev) =>
            prev.map((item) =>
              item.fileName === file.name
                ? { ...item, progress }
                : item
            )
          )
        })

        // 标记为完成
        setMediaFiles((prev) =>
          prev.map((item) =>
            item.fileName === file.name
              ? {
                  ...item,
                  status: 'complete' as const,
                  url: result.url,
                  path: result.path,
                  progress: 100,
                }
              : item
          )
        )
      } catch (error) {
        console.error('Upload error:', error)
        setMediaFiles((prev) =>
          prev.map((item) =>
            item.fileName === file.name
              ? {
                  ...item,
                  status: 'error' as const,
                  error: error instanceof Error ? error.message : '上传失败',
                }
              : item
          )
        )
      }
    }
    setIsUploading(false)
  }

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExternalMedia = (index: number) => {
    setExternalMedia((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddExternalUrl = () => {
    const trimmedUrl = externalUrl.trim()
    if (!trimmedUrl) return

    // 检测媒体类型和平台
    const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)(\?.|$)/i.test(trimmedUrl) ||
                   trimmedUrl.includes('bilibili.com') ||
                   trimmedUrl.includes('youtube.com') ||
                   trimmedUrl.includes('youtu.be')

    let finalUrl = trimmedUrl
    let platform: ExternalMedia['platform'] = 'direct'

    // 处理 Bilibili 链接
    if (trimmedUrl.includes('bilibili.com/video/BV')) {
      const match = trimmedUrl.match(/BV(\w+)/)
      if (match) {
        finalUrl = `https://player.bilibili.com/player.html?bvid=BV${match[1]}&high_quality=1`
        platform = 'bilibili'
      }
    }
    // 处理 YouTube 链接
    else if (trimmedUrl.includes('youtube.com/watch')) {
      const match = trimmedUrl.match(/[?&]v=([^&]+)/)
      if (match) {
        finalUrl = `https://www.youtube.com/embed/${match[1]}`
        platform = 'youtube'
      }
    } else if (trimmedUrl.includes('youtu.be/')) {
      const videoId = trimmedUrl.split('youtu.be/')[1]?.split('?')[0]
      if (videoId) {
        finalUrl = `https://www.youtube.com/embed/${videoId}`
        platform = 'youtube'
      }
    }

    setExternalMedia(prev => [...prev, {
      url: finalUrl,
      type: isVideo ? 'video' : 'image',
      platform,
    }])
    setExternalUrl('')
  }

  const handleCitySearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    if (!searchQuery.trim()) return

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      )
      const results = await response.json()

      if (results && results.length > 0) {
        const { lat, lon, display_name } = results[0]
        const latNum = parseFloat(lat)
        const lngNum = parseFloat(lon)

        setSearchedLocation({ lat: latNum, lng: lngNum })
        setSearchedCityName(display_name || searchQuery)

        // 通知父组件飞行到该位置
        if (onLocationSearch) {
          onLocationSearch(latNum, lngNum)
        }
      }
    } catch (error) {
      console.error('City search failed:', error)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!caption.trim()) {
      alert('先唠叨两句吧！☕')
      return
    }

    const finalLocation = searchedLocation || (initialLocation && initialLocation.lat !== undefined && initialLocation.lng !== undefined ? initialLocation : null)
    if (!finalLocation) {
      alert('先在地图上戳个点，或者输入城市搜索！🗺️')
      return
    }

    const completedUploads = mediaFiles.filter(
      (item) => item.status === 'complete' && item.url
    )

    if (completedUploads.length === 0 && externalMedia.length === 0 && !editingMemory) {
      alert('先打包点回忆素材吧！📸')
      return
    }

    // 合并上传的文件和外链
    const uploadedFilesMedia = completedUploads.map((item) => ({
      file: item.file,
      url: item.url!,
      path: item.path,
      isExternal: false,
    }))

    const externalFilesMedia = externalMedia.map((item) => ({
      file: new File([], 'external'),
      url: item.url,
      isExternal: true,
    }))

    onSubmit({
      location: finalLocation,
      cityName: searchedCityName || '未知地点',
      media: [...uploadedFilesMedia, ...externalFilesMedia],
      caption: caption.trim(),
    })

    // 重置表单
    setCaption('')
    setMediaFiles([])
    setExternalMedia([])
    setExternalUrl('')
    setSearchQuery('')
    setSearchedLocation(null)
    setSearchedCityName('')
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Form */}
      <div
        className="relative max-w-md w-full bg-white border-4 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ borderColor: colors.border }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b-2 bg-white flex-shrink-0" style={{ borderColor: colors.borderLight }}>
          <h2 className="text-xl font-bold text-center" style={{ color: colors.text }}>
            {editingMemory ? '编辑回忆' : microCopy.addMemory}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* City Search */}
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleCitySearch}
              placeholder="去过哪儿？输入城市直达..."
              disabled={isUploading}
              className="w-full px-4 py-3 border-3 rounded-xl outline-none focus:ring-4 transition-all disabled:opacity-50"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.pastelBlue,
                color: colors.text,
              }}
            />
          </div>

          {/* Location Display */}
          {searchedLocation || (initialLocation && initialLocation.lat !== undefined && initialLocation.lng !== undefined) ? (
            <div className="p-3 border-3 rounded-xl text-center" style={{ backgroundColor: colors.pastelBlue, borderColor: colors.border }}>
              <span className="text-sm">📍</span>
              <span className="text-sm ml-1" style={{ color: colors.text }}>
                {searchedLocation
                  ? `${searchedLocation.lat.toFixed(2)}°, ${searchedLocation.lng.toFixed(2)}°`
                  : initialLocation && initialLocation.lat !== undefined && initialLocation.lng !== undefined
                    ? `${initialLocation.lat.toFixed(2)}°, ${initialLocation.lng.toFixed(2)}°`
                    : ''
                }
              </span>
            </div>
          ) : (
            <div className="p-3 border-3 rounded-xl text-center" style={{ backgroundColor: colors.pastelOrange, borderColor: colors.border }}>
              <span className="text-sm">👆</span>
              <span className="text-sm ml-1" style={{ color: colors.text }}>
                点地图选个点，或输入城市搜索！
              </span>
            </div>
          )}

          {/* External URL Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: colors.text }}>
              外链（支持 Bilibili/网络直链）
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="粘贴 Bilibili 视频链接或网络图片/视频直链"
                disabled={isUploading}
                className="flex-1 px-4 py-3 border-3 rounded-xl outline-none focus:ring-4 transition-all disabled:opacity-50"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.pastelYellow,
                  color: colors.text,
                }}
              />
              <button
                type="button"
                onClick={handleAddExternalUrl}
                disabled={!externalUrl.trim() || isUploading}
                className="px-4 py-3 border-3 rounded-xl font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                style={{
                  backgroundColor: colors.pastelMint,
                  borderColor: colors.border,
                }}
              >
                添加
              </button>
            </div>
            {/* External media list */}
            {externalMedia.length > 0 && (
              <div className="space-y-2">
                {externalMedia.map((item, index) => (
                  <div key={index} className="relative flex items-center gap-2 p-2 border-2 rounded-lg" style={{ borderColor: colors.borderLight }}>
                    <span className="text-xl">
                      {item.platform === 'bilibili' ? '📺' : item.platform === 'youtube' ? '▶️' : item.type === 'video' ? '🎬' : '🖼️'}
                    </span>
                    <span className="text-sm flex-1 truncate" style={{ color: colors.text }}>
                      {item.platform === 'bilibili' ? 'Bilibili 视频' : item.platform === 'youtube' ? 'YouTube 视频' : item.url}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeExternalMedia(index)}
                      className="text-red-500 hover:text-red-600 font-bold px-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Media Upload - Local Files */}
          <div className="text-center text-xs mb-2" style={{ color: colors.textLight }}>
            ─── 或上传本地文件（最大 50MB）──
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`p-6 border-3 rounded-2xl text-center cursor-pointer transition-all ${
              isDragging ? 'scale-[1.02]' : ''
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{
              backgroundColor: isDragging ? colors.pastelPurple : colors.pastelPink,
              borderColor: colors.border,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="hidden"
            />

            {mediaFiles.length === 0 ? (
              <>
                <div className="text-4xl mb-2">📸</div>
                <p className="font-medium" style={{ color: colors.text }}>
                  {microCopy.uploadMedia}
                </p>
                <p className="text-xs mt-1" style={{ color: colors.textLight }}>
                  照片或视频，最大 50MB
                </p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">
                  {isUploading ? '📤' : '✅'}
                </div>
                <p className="font-medium" style={{ color: colors.text }}>
                  {isUploading ? '上传中...' : `${mediaFiles.length}个文件准备好！`}
                </p>
              </>
            )}
          </div>

          {/* Upload Progress Cards */}
          {mediaFiles.length > 0 && (
            <div className="space-y-3">
              {mediaFiles.map((item, index) => (
                <div key={index} className="relative">
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                    >
                      ×
                    </button>
                  )}
                  <div className="p-3 border-2 rounded-lg" style={{ borderColor: colors.borderLight, backgroundColor: item.status === 'error' ? colors.pastelOrange : 'white' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium truncate flex-1 mr-2" style={{ color: colors.text }}>
                        {item.fileName}
                      </span>
                      <span className="text-xs" style={{ color: colors.textLight }}>
                        {item.status === 'complete' ? '✅' : item.status === 'error' ? '❌' : `${item.progress}%`}
                      </span>
                    </div>
                    {item.status === 'uploading' && (
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${item.progress}%`,
                            backgroundColor: colors.primary,
                          }}
                        />
                      </div>
                    )}
                    {item.status === 'error' && (
                      <p className="text-xs text-red-500 mt-1">{item.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Caption Input */}
          <div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={microCopy.captionPlaceholder}
              rows={6}
              maxLength={2000}
              disabled={isUploading}
              className="w-full p-3 border-3 rounded-xl outline-none focus:ring-4 transition-all resize-y disabled:opacity-50"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.pastelYellow,
                color: colors.text,
                minHeight: '120px',
              }}
            />
            <div className="text-right text-xs mt-1" style={{ color: colors.textLight }}>
              {caption.length}/2000
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 py-3 border-3 rounded-xl font-medium transition-all hover:bg-gray-100 disabled:opacity-50"
              style={{ borderColor: colors.border }}
            >
              {microCopy.cancel}
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 py-3 border-3 rounded-xl font-medium transition-all hover:scale-105 shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              style={{
                backgroundColor: colors.pastelMint,
                borderColor: colors.border,
              }}
            >
              {isUploading ? '...' : editingMemory ? '更新' : microCopy.submit}
            </button>
          </div>
        </form>

        {/* Decorative doodles */}
        <div className="absolute -top-1 -left-1 w-6 h-6 border-2 rounded-full" style={{ borderColor: colors.primary }} />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-2 rotate-12" style={{ borderColor: colors.secondary }} />
      </div>
    </div>
  )
}
