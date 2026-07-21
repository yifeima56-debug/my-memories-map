'use client'

import { useRef, useState, useEffect, Dispatch, SetStateAction } from 'react'
import { colors } from '@/lib/theme'
import { uploadFile } from '@/lib/supabaseClient'

export interface Avatar {
  id: string
  name: string
  image: string
  color: string
}

interface AvatarDockProps {
  avatars: Avatar[]
  setAvatars: Dispatch<SetStateAction<Avatar[]>>
  activeAvatar?: string | null
  onAvatarClick: (id: string | null) => void
  onDeleteAvatar?: (id: string) => void
  onUpdateAvatar?: (id: string, updates: Partial<Avatar>) => void
  onCreateAvatar?: (avatar: Omit<Avatar, 'id'>) => void
}

// Available pastel colors for new avatars
const AVATAR_COLORS = [
  colors.pastelPink,
  colors.pastelBlue,
  colors.pastelPurple,
  colors.pastelMint,
  colors.pastelYellow,
  colors.pastelOrange,
  colors.secondary,
]

// Initial avatar data with Chinese names
const INITIAL_AVATARS: Avatar[] = [
  {
    id: '1',
    name: '法式白日梦想家',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    color: colors.pastelPink,
  },
  {
    id: '2',
    name: '英伦故事讲述者',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    color: colors.pastelBlue,
  },
  {
    id: '3',
    name: '意式探索者',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    color: colors.pastelPurple,
  },
  {
    id: '4',
    name: '德式追梦人',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    color: colors.pastelMint,
  },
  {
    id: '5',
    name: '西式流浪家',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    color: colors.pastelYellow,
  },
  {
    id: '6',
    name: '奥式快门大师',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
    color: colors.pastelOrange,
  },
  {
    id: '7',
    name: '捷克收藏家',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    color: colors.secondary,
  },
]

export default function AvatarDock({ avatars, setAvatars, activeAvatar, onAvatarClick, onDeleteAvatar, onUpdateAvatar, onCreateAvatar }: AvatarDockProps) {
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const addAvatarInputRef = useRef<HTMLInputElement>(null)
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [nameInputValue, setNameInputValue] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAvatarName, setNewAvatarName] = useState('')
  const [newAvatarImage, setNewAvatarImage] = useState<string | null>(null)
  const [deletingAvatarId, setDeletingAvatarId] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState<string | null>(null)


  const handleAvatarImageClick = (id: string) => {
    const fileInput = fileInputRefs.current[id]
    if (fileInput) {
      fileInput.click()
    }
  }

  const handleAvatarNameEdit = (id: string) => {
    const avatar = avatars.find(a => a.id === id)
    if (avatar) {
      setNameInputValue(avatar.name)
      setEditingNameId(id)
    }
  }

  const handleNameSave = () => {
    if (editingNameId && nameInputValue.trim()) {
      const updatedName = nameInputValue.trim()
      setAvatars((prev) =>
        prev.map((avatar) =>
          avatar.id === editingNameId
            ? { ...avatar, name: updatedName }
            : avatar
        )
      )

      // Sync to Supabase
      if (onUpdateAvatar) {
        onUpdateAvatar(editingNameId, { name: updatedName })
      }
    }
    setEditingNameId(null)
    setNameInputValue('')
  }

  const handleAvatarFilterToggle = (id: string) => {
    if (activeAvatar === id) {
      onAvatarClick(null)
    } else {
      onAvatarClick(id)
    }
  }

  const handleAvatarImageChange = async (id: string, file: File) => {
    if (file && file.type.startsWith('image/')) {
      setUploadingAvatar(id)

      try {
        // Upload to Supabase Storage
        const { url } = await uploadFile(file)

        // Update local state immediately for responsiveness
        setAvatars((prev) =>
          prev.map((avatar) =>
            avatar.id === id
              ? { ...avatar, image: url }
              : avatar
          )
        )

        // Sync to Supabase database
        if (onUpdateAvatar) {
          await onUpdateAvatar(id, { image: url })
        }
      } catch (error) {
        console.error('Failed to upload avatar image:', error)
        alert('头像上传失败，请重试')
      } finally {
        setUploadingAvatar(null)
      }
    }
  }

  const handleAddAvatar = async () => {
    if (!newAvatarName.trim()) {
      alert('请输入朋友名字')
      return
    }

    const newId = String(Date.now())
    const color = AVATAR_COLORS[avatars.length % AVATAR_COLORS.length]
    const defaultImage = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'

    let imageUrl = newAvatarImage || defaultImage

    // Upload image if provided
    if (newAvatarImage && newAvatarImage.startsWith('blob:')) {
      // Need to get the File object from the input
      const fileInput = addAvatarInputRef.current
      const file = fileInput?.files?.[0]

      if (file) {
        try {
          const { url } = await uploadFile(file)
          imageUrl = url
        } catch (error) {
          console.error('Failed to upload avatar image:', error)
          alert('头像上传失败，请重试')
          return
        }
      }
    }

    const newAvatar: Avatar = {
      id: newId,
      name: newAvatarName.trim(),
      image: imageUrl,
      color,
    }

    // Update local state immediately for responsiveness
    setAvatars([...avatars, newAvatar])

    // Sync to Supabase
    if (onCreateAvatar) {
      onCreateAvatar(newAvatar)
    }

    setShowAddModal(false)
    setNewAvatarName('')
    setNewAvatarImage(null)
  }

  const handleDeleteAvatar = (id: string) => {
    if (confirm('确定要删除这位朋友吗？他们的回忆也会保留，但将显示为"未知"。')) {
      // Update local state immediately
      setAvatars(avatars.filter(a => a.id !== id))
      if (activeAvatar === id) {
        onAvatarClick(null)
      }

      // Sync to Supabase
      if (onDeleteAvatar) {
        onDeleteAvatar(id)
      }
    }
    setDeletingAvatarId(null)
  }

  const handleAddAvatarImageChange = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(file)
      setNewAvatarImage(imageUrl)
    }
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[2000]">
        <div className="flex items-center gap-3 px-5 py-3 bg-white border-4 rounded-2xl shadow-lg max-w-[calc(100vw-64px)]" style={{ borderColor: colors.border }}>
          {avatars.map((avatar) => (
            <div key={avatar.id} className="relative flex-shrink-0">
              {/* Delete button - hidden by default, shows on hover */}
              <button
                onClick={() => handleDeleteAvatar(avatar.id)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500/90 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-all opacity-0 hover:opacity-100 scale-75 hover:scale-100 z-10 shadow-lg"
                aria-label="Delete avatar"
              >
                ×
              </button>

              {/* Avatar wrapper */}
              <div
                className={`w-[45px] h-[45px] rounded-full border-3 overflow-hidden transition-all ${
                  activeAvatar === avatar.id ? '-translate-y-2 scale-110' : ''
                }`}
                style={{ borderColor: activeAvatar === avatar.id ? avatar.color : colors.borderLight }}
              >
                {/* Avatar Image - click to change */}
                <div
                  onClick={(e) => !uploadingAvatar && handleAvatarImageClick(avatar.id)}
                  className="w-full h-full cursor-pointer hover:scale-105 transition-transform relative group"
                  style={{ opacity: uploadingAvatar === avatar.id ? 0.5 : 1 }}
                >
                  {uploadingAvatar === avatar.id ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-500"></div>
                    </div>
                  ) : (
                    <img
                      src={avatar.image}
                      alt={avatar.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Upload hint on hover */}
                  {!uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-2xl">📷</span>
                    </div>
                  )}
                </div>

                {/* Active indicator */}
                {activeAvatar === avatar.id && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ backgroundColor: avatar.color }} />
                )}
              </div>

              {/* Name display / Input */}
              <div
                onClick={() => handleAvatarNameEdit(avatar.id)}
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 min-w-[80px] text-center"
              >
                {editingNameId === avatar.id ? (
                  <input
                    type="text"
                    value={nameInputValue}
                    onChange={(e) => setNameInputValue(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleNameSave()
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1 text-xs border-2 rounded outline-none focus:ring-2"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                      color: colors.text,
                      minWidth: '60px',
                    }}
                    autoFocus
                  />
                ) : (
                  <div
                    className="px-3 py-1 text-xs whitespace-nowrap rounded-2 cursor-pointer hover:scale-105 transition-all"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                      color: colors.text,
                    }}
                  >
                    {avatar.name}
                  </div>
                )}
              </div>

              {/* Hidden file input for image upload */}
              <input
                ref={(el) => { fileInputRefs.current[avatar.id] = el }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleAvatarImageChange(avatar.id, file)
                }}
              />
            </div>
          ))}

          {/* Add avatar button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-[45px] h-[45px] rounded-full border-3 flex items-center justify-center text-2xl transition-all duration-200 hover:-translate-y-1 hover:bg-blue-50 flex-shrink-0"
            style={{ borderColor: colors.border }}
          >
            +
          </button>
        </div>
      </div>

      {/* Add Avatar Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative max-w-md w-full bg-white border-4 rounded-3xl shadow-2xl overflow-hidden"
            style={{ borderColor: colors.border }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b-2 bg-white" style={{ borderColor: colors.borderLight }}>
              <h2 className="text-xl font-bold text-center" style={{ color: colors.text }}>
                添加朋友
              </h2>
            </div>
            <div className="p-6 space-y-5">
              {/* Avatar upload */}
              <div
                onClick={() => addAvatarInputRef.current?.click()}
                className="w-24 h-24 mx-auto rounded-full border-3 overflow-hidden cursor-pointer hover:scale-105 transition-all"
                style={{ borderColor: colors.border }}
              >
                {newAvatarImage ? (
                  <img src={newAvatarImage} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-100">
                    📷
                  </div>
                )}
              </div>
              <input
                ref={addAvatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleAddAvatarImageChange(file)
                }}
              />

              {/* Name input */}
              <input
                type="text"
                value={newAvatarName}
                onChange={(e) => setNewAvatarName(e.target.value)}
                placeholder="输入朋友名字"
                className="w-full px-4 py-3 border-3 rounded-xl outline-none focus:ring-4 transition-all"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.pastelBlue,
                  color: colors.text,
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddAvatar()
                }}
              />

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border-3 rounded-xl font-medium transition-all hover:bg-gray-100"
                  style={{ borderColor: colors.border }}
                >
                  取消
                </button>
                <button
                  onClick={handleAddAvatar}
                  className="flex-1 py-3 border-3 rounded-xl font-medium transition-all hover:scale-105 shadow-lg"
                  style={{
                    backgroundColor: colors.pastelMint,
                    borderColor: colors.border,
                  }}
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export { INITIAL_AVATARS }