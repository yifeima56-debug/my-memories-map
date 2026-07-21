'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { colors, microCopy } from '@/lib/theme'

interface InteractiveMapProps {
  onPinClick: (pin: any) => void
  onMapClick: (lat: number, lng: number) => void
  pins: any[]
  activeAvatar?: string | null
  flyToLocation?: { lat: number; lng: number } | null
  avatars?: { id: string; name: string; image?: string }[]
}

// Europe bounds
const EUROPE_BOUNDS = {
  north: 72,
  south: 34,
  east: 45,
  west: -25,
}

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Create custom avatar marker icon
const createAvatarMarkerIcon = (isActive: boolean = true, avatarImage?: string, avatarColor?: string) => {
  const pinColor = avatarColor || colors.pastelPink
  const opacity = isActive ? 1 : 0.4
  const scale = isActive ? 1 : 0.75

  // 如果有头像图片，使用头像样式
  if (avatarImage) {
    return L.divIcon({
      className: 'avatar-marker',
      html: `
        <div style="
          position: relative;
          width: 44px;
          height: 54px;
          opacity: ${opacity};
          transform: scale(${scale});
          transform-origin: center bottom;
        ">
          <!-- 头像圆圈 -->
          <div style="
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 36px;
            height: 36px;
            background-image: url('${avatarImage}');
            background-size: cover;
            background-position: center;
            border-radius: 50%;
            border: 3px solid #2D3748;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.1);
            z-index: 2;
          "></div>
          <!-- Pin 底部箭头 -->
          <div style="
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 12px solid #2D3748;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
            z-index: 1;
          "></div>
        </div>
      `,
      iconSize: [44, 54],
      iconAnchor: [22, 54],
      popupAnchor: [0, -50],
    })
  }

  // 降级：使用默认可爱 pin 样式
  return L.divIcon({
    className: 'cute-pin',
    html: `
      <div style="
        position: relative;
        width: 30px;
        height: 40px;
        opacity: ${opacity};
        transform: scale(${scale});
      ">
        <div style="
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid #2D3748;
        "></div>
        <div style="
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 24px;
          background: ${pinColor};
          border: 3px solid #2D3748;
          border-radius: 50% 50% 50% 0;
          transform: translateX(-50%) rotate(-45deg);
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        "></div>
      </div>
    `,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40],
  })
}

export default function InteractiveMap({ onPinClick, onMapClick, pins, activeAvatar, flyToLocation, avatars = [] }: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.Marker[]>([])

  // Handle flyTo animation
  useEffect(() => {
    const map = mapRef.current
    if (map && flyToLocation) {
      map.flyTo([flyToLocation.lat, flyToLocation.lng], 12, {
        duration: 1.5,
      })
    }
  }, [flyToLocation])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [48.5, 15.0], // Europe center adjusted to show Mediterranean better
      zoom: 4,
      maxBounds: [
        [EUROPE_BOUNDS.south, EUROPE_BOUNDS.west],
        [EUROPE_BOUNDS.north, EUROPE_BOUNDS.east]
      ],
      maxBoundsViscosity: 1.0,
      zoomControl: false, // Disable default zoom control to reposition it
      attributionControl: true,
    })

    // Add zoom control to bottom right to avoid overlapping with user switcher
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map)

    // Add OpenStreetMap standard tile layer with CSS filter for retro effect
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: 'abc',
      maxZoom: 19,
    }).addTo(map)

    // Add click event listener
    map.on('click', (e) => {
      const { lat, lng } = e.latlng
      console.log('艺术细胞雷达捕捉到坐标：', lat, lng)

      // Visual feedback
      L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: colors.pastelMint,
        color: colors.border,
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(map).openPopup()

      // Trigger add memory form
      onMapClick(lat, lng)
    })

    mapRef.current = map

    // Cleanup
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [onMapClick])

  // Update markers when pins or activeAvatar changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Avatar colors mapping
    const avatarColors: { [key: string]: string } = {
      '1': colors.pastelPink,
      '2': colors.pastelBlue,
      '3': colors.pastelPurple,
      '4': colors.pastelMint,
      '5': colors.pastelYellow,
      '6': colors.pastelOrange,
      '7': colors.secondary,
    }

    // Add new markers
    pins.forEach((pin) => {
      // Check if this pin belongs to the active avatar
      const isOwnPin = !activeAvatar || pin.authorId === activeAvatar

      // 获取创建者的头像图片
      const creator = pin.authorId ? avatars.find?.(a => a.id === pin.authorId) : null
      const avatarImage = creator?.image
      const avatarColor = pin.authorId ? avatarColors[pin.authorId] : undefined

      const marker = L.marker([pin.lat, pin.lng], {
        icon: createAvatarMarkerIcon(
          isOwnPin,
          avatarImage,
          avatarColor
        ),
      })

      // Create popup content
      const avatarName = creator?.name || '未知'
      const popupContent = `
        <div style="
          text-align: center;
          font-family: system-ui, -apple-system, sans-serif;
        ">
          <div style="font-size: 24px; margin-bottom: 4px;">📍</div>
          <div style="font-weight: bold; color: #2D3748;">${pin.location}</div>
          <div style="font-size: 12px; color: #718096; margin-top: 4px;">${avatarName}</div>
        </div>
      `

      marker.bindPopup(popupContent)

      marker.on('click', () => {
        onPinClick(pin)
      })

      marker.addTo(map)
      markersRef.current.push(marker)
    })
  }, [pins, activeAvatar, onPinClick, avatars])

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      style={{
        minHeight: '100vh',
        filter: 'sepia(0.3) saturate(1.3) contrast(1.05) hue-rotate(-10deg)',
      }}
    />
  )
}