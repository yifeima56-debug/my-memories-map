import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '旅行记忆相册',
  description: '和朋友一起记录旅途中的美好回忆',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}