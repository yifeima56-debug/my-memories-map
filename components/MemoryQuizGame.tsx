'use client'

import { useState, useEffect } from 'react'
import { colors } from '@/lib/theme'

interface MemoryQuizGameProps {
  memories: Array<{
    id: string
    location: string
    authorId: string
    media: Array<{ type: string; url: string }>
  }>
  avatars: Array<{ id: string; name: string; image: string }>
}

// 欧洲城市列表（用于干扰项）
const EUROPEAN_CITIES = [
  '巴黎', '伦敦', '罗马', '柏林', '马德里', '维也纳', '阿姆斯特丹',
  '布拉格', '布达佩斯', '华沙', '雅典', '里斯本', '斯德哥尔摩', '哥本哈根',
  '都柏林', '赫尔辛基', '奥斯陆', '莫斯科', '圣彼得堡', '巴塞罗那', '米兰',
  '威尼斯', '佛罗伦萨', '慕尼黑', '汉堡', '科隆', '布鲁塞尔', '苏黎世',
  '日内瓦', '布拉迪斯拉发', '卢布尔雅那', '萨格勒布', '索非亚', '布加勒斯特',
  '贝尔格莱德', '萨那耶沃', '地拉那', '斯科普里', '波德戈里察', '普里什蒂纳'
]

export default function MemoryQuizGame({ memories, avatars }: MemoryQuizGameProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<{
    memory: any
    options: string[]
    correctAnswer: string
    selectedAnswer: string | null
    isCorrect: boolean | null
  } | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  // 抽取随机记忆
  const getRandomMemory = () => {
    const memoriesWithMedia = memories.filter(m =>
      m.media && m.media.length > 0 && m.media[0].type === 'image'
    )

    if (memoriesWithMedia.length === 0) {
      alert('还没有照片可以猜！先添加一些回忆吧～')
      return
    }

    const randomIndex = Math.floor(Math.random() * memoriesWithMedia.length)
    const memory = memoriesWithMedia[randomIndex]

    // 提取城市名称（简化处理）
    const correctCity = memory.location.split(',')[0].trim()

    // 生成3个随机干扰项
    const distractors = EUROPEAN_CITIES
      .filter(city => city !== correctCity)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)

    // 组合所有选项并打乱
    const allOptions = [correctCity, ...distractors].sort(() => Math.random() - 0.5)

    setCurrentQuestion({
      memory,
      options: allOptions,
      correctAnswer: correctCity,
      selectedAnswer: null,
      isCorrect: null,
    })
  }

  // 处理答案选择
  const handleAnswer = (answer: string) => {
    if (!currentQuestion || currentQuestion.selectedAnswer !== null) return

    const isCorrect = answer === currentQuestion.correctAnswer
    setCurrentQuestion({
      ...currentQuestion,
      selectedAnswer: answer,
      isCorrect,
    })

    if (isCorrect) {
      // 触发烟花特效
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }
  }

  // 下一题
  const handleNextQuestion = () => {
    getRandomMemory()
  }

  // 打开游戏时开始
  const handleOpen = () => {
    setIsOpen(true)
    getRandomMemory()
  }

  // 获取上传者信息
  const getAuthorInfo = () => {
    if (!currentQuestion) return null
    return avatars.find(a => a.id === currentQuestion.memory.authorId)
  }

  return (
    <>
      {/* 游戏入口按钮 */}
      <button
        onClick={handleOpen}
        className="group relative px-4 py-2 bg-white border-4 rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
        style={{
          position: 'fixed',
          left: '20px',
          bottom: '120px',
          zIndex: 1000,
          borderColor: colors.border,
        }}
      >
        <span className="text-lg">🎲</span>
        <span className="ml-2 text-sm font-medium" style={{ color: colors.text }}>
          猜猜看
        </span>

        {/* 悬停提示 */}
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs whitespace-nowrap rounded border-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
             style={{
               backgroundColor: colors.border,
               borderColor: colors.borderLight,
               color: colors.card,
             }}>
          猜猜这张照片在哪里拍的？
        </div>
      </button>

      {/* 游戏弹窗 */}
      {isOpen && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4" onClick={() => setIsOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div
            className="relative max-w-lg w-full bg-white border-4 rounded-3xl shadow-2xl overflow-hidden"
            style={{ borderColor: colors.border }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="p-4 border-b-2 bg-white flex justify-between items-center" style={{ borderColor: colors.borderLight }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: colors.text }}>
                <span className="text-2xl">🎲</span>
                照片猜猜看
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110"
                style={{ borderColor: colors.borderLight }}
              >
                ✕
              </button>
            </div>

            {/* 游戏内容 */}
            <div className="p-6 space-y-6">
              {currentQuestion ? (
                <>
                  {/* 照片展示 */}
                  <div className="relative">
                    <img
                      src={currentQuestion.memory.media[0].url}
                      alt="Guess this location"
                      className="w-full h-64 object-cover rounded-2xl"
                    />

                    {/* 上传者信息 */}
                    {getAuthorInfo() && (
                      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg">
                        <img
                          src={getAuthorInfo()!.image}
                          alt={getAuthorInfo()!.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-sm font-medium" style={{ color: colors.text }}>
                          {getAuthorInfo()!.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 题目 */}
                  <div className="text-center">
                    <p className="text-lg" style={{ color: colors.text }}>
                      这张照片是在哪个城市拍的？
                    </p>
                  </div>

                  {/* 选项 */}
                  <div className="grid grid-cols-2 gap-3">
                    {currentQuestion.options.map((option, index) => {
                      const isSelected = currentQuestion.selectedAnswer === option
                      const isCorrect = currentQuestion.correctAnswer === option
                      const showResult = currentQuestion.selectedAnswer !== null

                      return (
                        <button
                          key={index}
                          onClick={() => handleAnswer(option)}
                          disabled={showResult}
                          className={`px-4 py-3 border-3 rounded-xl font-medium transition-all ${
                            showResult
                              ? isCorrect
                                ? 'bg-green-100 border-green-500 text-green-700'
                                : isSelected && !isCorrect
                                  ? 'bg-red-100 border-red-500 text-red-700'
                                  : 'bg-gray-50 border-gray-200 text-gray-400'
                              : 'hover:scale-105'
                          }`}
                          style={{
                            borderColor: showResult
                              ? isCorrect
                                ? '#22c55e'
                                : isSelected && !isCorrect
                                  ? '#ef4444'
                                  : colors.border
                              : colors.border,
                          }}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>

                  {/* 结果反馈 */}
                  {currentQuestion.selectedAnswer !== null && (
                    <div className={`text-center p-4 rounded-xl ${
                      currentQuestion.isCorrect ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <p className="font-medium" style={{ color: currentQuestion.isCorrect ? '#16a34a' : '#dc2626' }}>
                        {currentQuestion.isCorrect ? '🎉 太棒了！答对了！' : '😅 答错了...'}
                      </p>
                      {!currentQuestion.isCorrect && (
                        <p className="text-sm mt-2" style={{ color: colors.textLight }}>
                          正确答案是：{currentQuestion.correctAnswer}
                        </p>
                      )}
                      <button
                        onClick={handleNextQuestion}
                        className="mt-4 px-6 py-2 bg-white border-3 rounded-full font-medium transition-all hover:scale-105"
                        style={{ borderColor: colors.border }}
                      >
                        下一题 →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📸</div>
                  <p className="text-lg" style={{ color: colors.textLight }}>
                    暂时没有可以猜的照片
                  </p>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="mt-6 px-6 py-2 bg-white border-3 rounded-full font-medium transition-all hover:scale-105"
                    style={{ borderColor: colors.border }}
                  >
                    关闭
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 烟花特效 */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[6000]" style={{ overflow: 'hidden' }}>
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                fontSize: `${Math.random() * 20 + 20}px`,
                animationDuration: `${Math.random() * 2 + 1}s`,
              }}
            >
              {['🎉', '🎊', '✨', '💫', '⭐'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
