import { NextRequest, NextResponse } from 'next/server'
import { searchLocalDatabase } from '@/lib/cityDatabase'

interface SearchResult {
  lat: number
  lon: number
  display_name: string
  importance?: number
  type?: string
}

// 改进的中文地理编码函数，使用 AbortController 设置超时
async function searchLocation(query: string): Promise<SearchResult[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000) // 15秒超时

  try {
    // 使用 Nominatim API 进行地理编码
    const response = await Promise.race([
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=cn,jp,kr,fr,de,it,es,gb,us,th,sg,my,vn`,
        {
          headers: {
            'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
            'User-Agent': 'MemoriesMap/1.0 (https://github.com/user/repo)',
          },
          signal: controller.signal,
        }
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      ),
    ]) as Response

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error('Geocoding API request failed')
    }

    const results = await response.json()

    if (!results || results.length === 0) {
      // 如果直接搜索失败，尝试拼音搜索（移除空格和声调）
      const pinyinQuery = query.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, '')
                                   .replace(/\s+/g, '')
      if (pinyinQuery !== query) {
        return searchLocation(pinyinQuery)
      }

      return []
    }

    return results
  } catch (error) {
    clearTimeout(timeoutId)

    // 如果是超时错误，返回特定的错误信息
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('搜索请求超时，请稍后重试')
    }

    // 如果是网络连接问题
    if (error instanceof Error && (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT'))) {
      throw new Error('无法连接到搜索服务，请检查网络连接')
    }

    console.error('Geocoding error:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: '请输入搜索关键词' },
      { status: 400 }
    )
  }

  try {
    // 先检查本地数据库
    const localResults = searchLocalDatabase(query.trim())

    if (localResults.length > 0) {
      // 格式化本地数据库结果
      const formattedResults = localResults.map(result => ({
        lat: result.lat,
        lon: result.lon,
        displayName: result.displayName,
        cityName: extractCityName(result.displayName),
      }))

      return NextResponse.json({
        results: formattedResults,
      })
    }

    // 本地数据库没有匹配，尝试网络搜索
    const onlineResults = await searchLocation(query.trim())

    if (onlineResults.length === 0) {
      return NextResponse.json(
        {
          error: '未找到该地点',
          suggestions: [
            '尝试使用英文名称，如 "Beijing", "Paris", "Tokyo"',
            '尝试使用拼音，如 "beijing", "shanghai"',
            '尝试更详细的地名，如 "北京市", "巴黎市"',
          ]
        },
        { status: 404 }
      )
    }

    // 格式化结果，保留必要信息
    const formattedResults = onlineResults.map(result => ({
      lat: typeof result.lat === 'string' ? parseFloat(result.lat) : result.lat,
      lon: typeof result.lon === 'string' ? parseFloat(result.lon) : result.lon,
      displayName: result.display_name,
      // 提取城市/地区名称
      cityName: extractCityName(result.display_name),
    }))

    return NextResponse.json({
      results: formattedResults,
    })

  } catch (error) {
    console.error('API Error:', error)

    // 如果网络搜索失败，尝试返回本地数据库的结果
    const localResults = searchLocalDatabase(query.trim())
    if (localResults.length > 0) {
      const formattedResults = localResults.map(result => ({
        lat: result.lat,
        lon: result.lon,
        displayName: result.displayName,
        cityName: extractCityName(result.displayName),
      }))

      return NextResponse.json({
        results: formattedResults,
      })
    }

    // 网络错误且本地数据库也没有匹配
    const errorMessage = error instanceof Error ? error.message : '搜索失败，请稍后重试'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// 提取城市名称（简化版）
function extractCityName(displayName: string): string {
  // Nominatim 返回的格式通常是：城市名, 区/省, 国家
  const parts = displayName.split(',').map(p => p.trim())
  return parts[0] || displayName
}