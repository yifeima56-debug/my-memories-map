'use client'

import { useState, useEffect } from 'react'
import { colors } from '@/lib/theme'
import { fetchComments, createComment, deleteComment as supabaseDeleteComment, Comment, subscribeToComments } from '@/lib/supabaseClient'

interface CommentsProps {
  memoryId: string
  avatars: Array<{ id: string; name: string; image: string }>
  currentUserId?: string
}

export default function Comments({ memoryId, avatars, currentUserId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 加载评论
  useEffect(() => {
    loadComments()

    // 订阅实时更新
    const unsubscribe = subscribeToComments(memoryId, (updatedComments) => {
      setComments(updatedComments)
    })

    return () => {
      unsubscribe?.()
    }
  }, [memoryId])

  const loadComments = async () => {
    try {
      const data = await fetchComments(memoryId)
      setComments(data)
    } catch (err) {
      console.error('Failed to load comments:', err)
      setComments([])
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newComment.trim() || !currentUserId) {
      if (!currentUserId) {
        alert('请先选择一个朋友身份来发表评论')
      }
      return
    }

    setIsSubmitting(true)
    try {
      await createComment({
        memory_id: memoryId,
        author_id: currentUserId,
        content: newComment.trim(),
      })

      setNewComment('')
      // 评论列表会通过订阅自动更新
    } catch (error: any) {
      console.error('Error submitting comment:', error)
      // 显示详细错误信息
      const errorMsg = error?.message
        ? `评论失败: ${error.message}`
        : '评论失败，请重试'
      alert(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string, authorId: string) => {
    if (authorId !== currentUserId) {
      alert('只能删除自己的评论')
      return
    }

    if (!confirm('确定要删除这条评论吗？')) return

    setDeletingId(commentId)
    try {
      await supabaseDeleteComment(commentId)
      // 评论列表会通过订阅自动更新
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('删除失败，请重试')
    } finally {
      setDeletingId(null)
    }
  }

  const getAuthorInfo = (authorId: string) => {
    return avatars.find(a => a.id === authorId) || { name: '未知', image: 'https://via.placeholder.com/32' }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <div className="space-y-4">
      {/* 评论列表 */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="text-center py-4" style={{ color: colors.textLight }}>
            <div className="text-3xl mb-2">💬</div>
            <p className="text-sm">还没有评论，说点什么吧～</p>
          </div>
        ) : (
          comments.map((comment) => {
            const author = getAuthorInfo(comment.author_id)
            const canDelete = comment.author_id === currentUserId
            return (
              <div key={comment.id} className="flex gap-3 items-start group">
                <img
                  src={author.image}
                  alt={author.name}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 border-2"
                  style={{ borderColor: colors.borderLight }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium" style={{ color: colors.text }}>
                      {author.name}
                    </span>
                    <span className="text-xs" style={{ color: colors.textLight }}>
                      {comment.created_at && formatTime(comment.created_at)}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <p className="text-sm flex-1" style={{ color: colors.text }}>
                      {comment.content}
                    </p>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteComment(comment.id!, comment.author_id!)}
                        disabled={deletingId === comment.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 disabled:opacity-50 text-xs"
                        title="删除评论"
                      >
                        {deletingId === comment.id ? '...' : '🗑️'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSubmitComment} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="写下你的评论..."
          disabled={!currentUserId || isSubmitting}
          className="flex-1 px-4 py-2 border-2 rounded-full outline-none focus:ring-2 transition-all disabled:opacity-50"
          style={{
            borderColor: colors.borderLight,
            backgroundColor: colors.pastelBlue,
            color: colors.text,
          }}
        />
        <button
          type="submit"
          disabled={!newComment.trim() || !currentUserId || isSubmitting}
          className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
        >
          {isSubmitting ? '...' : '发送'}
        </button>
      </form>

      {!currentUserId && (
        <p className="text-xs text-center" style={{ color: colors.textLight }}>
          请先选择一个朋友身份来发表评论
        </p>
      )}
    </div>
  )
}
