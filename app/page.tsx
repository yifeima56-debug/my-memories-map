'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamic import InteractiveMap with SSR disabled
const InteractiveMap = dynamic(
  () => import('@/components/InteractiveMap'),
  { ssr: false }
)

import AvatarDock from '@/components/AvatarDock'
import FloatingControls from '@/components/FloatingControls'
import MemoryModal from '@/components/MemoryModal'
import AddPinForm from '@/components/AddPinForm'
import MemoryList from '@/components/MemoryList'
import { colors, microCopy } from '@/lib/theme'
import { supabase, Memory as SupabaseMemory, Avatar as SupabaseAvatar, fetchMemories, fetchAvatars, subscribeToMemories, createMemory, createAvatar, updateAvatar, deleteAvatar, updateMemory, deleteMemory as supabaseDeleteMemory } from '@/lib/supabaseClient'

export default function Home() {
  const [pins, setPins] = useState<any[]>([])
  const [selectedPin, setSelectedPin] = useState<any | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [activeAvatar, setActiveAvatar] = useState<string | null>(null)
  const [avatars, setAvatars] = useState<SupabaseAvatar[]>([])
  const [currentUser, setCurrentUser] = useState<string>('')
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingPin, setEditingPin] = useState<any | null>(null)

  // Load data from Supabase on mount
  useEffect(() => {
    loadData()

    // Subscribe to real-time updates
    const unsubscribe = subscribeToMemories((memories) => {
      setPins(memories.map(transformMemoryToPin).filter(Boolean))
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load avatars
      const avatarsData = await fetchAvatars()
      if (avatarsData.length === 0) {
        // Initialize default avatars
        const defaultAvatars = [
          { name: '法式白日梦想家', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', color: colors.pastelPink },
          { name: '英伦故事讲述者', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', color: colors.pastelBlue },
          { name: '意式探索者', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', color: colors.pastelPurple },
          { name: '德式追梦人', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face', color: colors.pastelMint },
          { name: '西式流浪家', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', color: colors.pastelYellow },
          { name: '奥式快门大师', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face', color: colors.pastelOrange },
          { name: '捷克收藏家', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face', color: colors.secondary },
        ]

        for (const avatar of defaultAvatars) {
          await createAvatar(avatar)
        }

        const refreshed = await fetchAvatars()
        setAvatars(refreshed)
        if (refreshed.length > 0) {
          setCurrentUser(refreshed[0].id!)
        }
      } else {
        setAvatars(avatarsData)
        setCurrentUser(avatarsData[0].id!)
      }

      // Load memories
      const memoriesData = await fetchMemories()
      setPins(memoriesData.map(transformMemoryToPin).filter(Boolean))
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const transformMemoryToPin = (memory: SupabaseMemory) => {
    // Skip memories without valid coordinates
    if (memory.lat === null || memory.lat === undefined || memory.lng === null || memory.lng === undefined) {
      return null
    }

    return {
      id: memory.id,
      lat: memory.lat,
      lng: memory.lng,
      location: memory.location,
      caption: memory.caption,
      date: memory.date,
      authorId: memory.author_id,
      media: memory.media || [],
    }
  }

  const handlePinClick = (pin: any) => {
    setSelectedPin(pin)
  }

  const handleMapClick = (lat: number, lng: number) => {
    setPendingLocation({ lat, lng })
    setShowAddForm(true)
  }

  const handleAddMemory = () => {
    setEditingPin(null)
    setPendingLocation(null)
    setShowAddForm(true)
  }

  const handleEditMemory = (memory: any) => {
    // Only allow editing if the memory has valid coordinates
    if (memory.lat !== undefined && memory.lng !== undefined) {
      setEditingPin(memory)
      setShowAddForm(true)
    } else {
      alert('无法编辑此回忆：缺少位置信息')
    }
  }

  const handleDeleteMemory = async (id: string) => {
    try {
      await supabaseDeleteMemory(id)
      await loadData()
    } catch (error) {
      console.error('Error deleting memory:', error)
      alert('删除失败，请重试')
    }
  }

  const handleLocationSearch = async (lat: number, lng: number) => {
    setFlyToLocation({ lat, lng })
  }

  const handleFormSubmit = async (data: {
    location: { lat: number; lng: number }
    cityName: string
    media: { file: File; url: string; path?: string; isExternal?: boolean }[]
    caption: string
  }) => {
    try {
      const userData = avatars.find(a => a.id === currentUser) || avatars[0]

      const newMediaItems = data.media.map((m) => ({
        type: m.file?.type.startsWith('image/') ? 'image' : 'video',
        url: m.url,
        creator_id: userData.id,
        caption: data.caption,
        is_external: m.isExternal || false,
      }))

      if (editingPin) {
        // Update existing memory
        const updatedMemory = await updateMemory(editingPin.id, {
          lat: data.location.lat,
          lng: data.location.lng,
          location: data.cityName,
          caption: data.caption,
          media: newMediaItems,
        })

        // Update local state
        setPins(prev => prev.map(pin =>
          pin.id === editingPin.id
            ? transformMemoryToPin(updatedMemory) || pin
            : pin
        ))

        setEditingPin(null)
      } else {
        // Check if a pin already exists at this location
        const TOLERANCE = 0.001
        const existingPin = pins.find(
          pin => Math.abs(pin.lat - data.location.lat) < TOLERANCE &&
                Math.abs(pin.lng - data.location.lng) < TOLERANCE
        )

        if (existingPin) {
          // Update existing memory with new media
          const updatedMedia = [...(existingPin.media || []), ...newMediaItems]
          const updated = await updateMemory(existingPin.id, { media: updatedMedia })

          setPins(prev => prev.map(pin =>
            pin.id === existingPin.id
              ? { ...pin, media: updatedMedia }
              : pin
          ))
        } else {
          // Create new memory
          const newMemory: Omit<SupabaseMemory, 'id' | 'created_at'> = {
            lat: data.location.lat,
            lng: data.location.lng,
            location: data.cityName,
            caption: data.caption,
            date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            author_id: userData.id,
            media: newMediaItems,
          }

          const created = await createMemory(newMemory)
          const newPin = transformMemoryToPin(created)
          if (newPin) {
            setPins(prev => [...prev, newPin])
          }
        }
      }

      setShowAddForm(false)
      setPendingLocation(null)
    } catch (error) {
      console.error('Error submitting memory:', error)
      alert('保存失败，请重试')
    }
  }

  const handleViewToggle = () => {
    setViewMode((prev) => (prev === 'map' ? 'list' : 'map'))
  }

  const handleAvatarUpdate = (updatedAvatars: SupabaseAvatar[]) => {
    setAvatars(updatedAvatars)
  }

  const handleAvatarDelete = async (id: string) => {
    try {
      await deleteAvatar(id)
      await loadData()
    } catch (error) {
      console.error('Error deleting avatar:', error)
    }
  }

  const filteredPins = viewMode === 'map'
    ? pins
    : pins.filter((pin) => !activeAvatar || pin.authorId === activeAvatar)

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="text-center">
          <div className="text-6xl mb-4">🌍</div>
          <p style={{ color: colors.text }}>正在连接云端...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ backgroundColor: colors.background }}>
      {/* User Switcher - Top Left */}
      <div className="fixed top-4 left-4 z-[2500]">
        <div className="flex items-center gap-2 px-3 py-2 bg-white border-2 rounded-lg shadow-md text-xs" style={{ borderColor: colors.borderLight }}>
          <span style={{ color: colors.textLight }}>当前登录:</span>
          <select
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value)}
            className="outline-none font-medium"
            style={{ color: colors.text }}
          >
            {avatars.map((avatar) => (
              <option key={avatar.id} value={avatar.id}>
                {avatar.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {viewMode === 'map' ? (
        <div className="w-full h-full">
          <InteractiveMap
            onPinClick={handlePinClick}
            onMapClick={handleMapClick}
            pins={pins}
            activeAvatar={activeAvatar}
            flyToLocation={flyToLocation}
            avatars={avatars.map(a => ({ id: a.id, name: a.name }))}
          />
        </div>
      ) : (
        <div className="w-full h-full">
          <MemoryList memories={filteredPins} onMemoryClick={handlePinClick} avatars={avatars.map(a => ({ id: a.id, name: a.name }))} />
        </div>
      )}

      {/* Empty State */}
      {viewMode === 'map' && filteredPins.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center space-y-2">
            <div className="text-6xl">👻</div>
            <p className="text-xl font-bold" style={{ color: colors.text }}>
              {activeAvatar
                ? `${avatars.find(a => a.id === activeAvatar)?.name || 'This friend'} 还没留下回忆呢！`
                : microCopy.emptyMap}
            </p>
          </div>
        </div>
      )}

      {/* Avatar Dock */}
      <AvatarDock
        avatars={avatars}
        setAvatars={handleAvatarUpdate}
        activeAvatar={activeAvatar}
        onAvatarClick={setActiveAvatar}
        onDeleteAvatar={handleAvatarDelete}
      />

      {/* Floating Controls */}
      <FloatingControls
        onAddMemory={handleAddMemory}
        viewMode={viewMode}
        onViewToggle={handleViewToggle}
      />

      {/* Memory Modal */}
      {selectedPin && (
        <MemoryModal
          memory={selectedPin}
          onClose={() => setSelectedPin(null)}
          avatars={avatars.map(a => ({ id: a.id, name: a.name }))}
          onEdit={handleEditMemory}
          onDelete={handleDeleteMemory}
          isCurrentUser={selectedPin.authorId === currentUser}
        />
      )}

      {/* Add Pin Form */}
      <AddPinForm
        isOpen={showAddForm}
        onClose={() => {
          setShowAddForm(false)
          setEditingPin(null)
        }}
        onSubmit={handleFormSubmit}
        initialLocation={
          pendingLocation ||
          (editingPin && editingPin.lat !== undefined && editingPin.lng !== undefined
            ? { lat: editingPin.lat, lng: editingPin.lng }
            : undefined
        )}
        onLocationSearch={handleLocationSearch}
        editingMemory={editingPin}
      />
    </div>
  )
}