import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const STATUS_COLORS = {
  gray: '#718096',
  red: '#e53e3e',
  green: '#38a169'
}

const STATUS_LABELS = {
  gray: '有问题',
  red: '未完成',
  green: '已完成'
}

export default function TaskCard({ card, onStatusChange, onDelete, onDragStart, onContentChange, onDragEnterCard }) {
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(card.content || '')
  const [showInput, setShowInput] = useState(false)
  const inputRef = useRef(null)
  const { user } = useAuth()
  const isOwner = user?._id === card.creatorId

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showInput])

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showMenu && !e.target.closest('.card-menu')) {
        setShowMenu(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showMenu])

  const handleStatusClick = (e) => {
    e.stopPropagation()
    const statuses = ['gray', 'red', 'green']
    const currentIndex = statuses.indexOf(card.status)
    const nextStatus = statuses[(currentIndex + 1) % statuses.length]
    onStatusChange(card._id, nextStatus)
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    if (window.confirm('确定要删除这个任务吗？')) {
      onDelete(card._id)
    }
    setShowMenu(false)
  }

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', card._id)
    if (onDragStart) {
      onDragStart(e, card)
    }
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    if (onDragEnterCard) {
      onDragEnterCard(e, card)
    }
  }

  const handleContentSubmit = () => {
    if (editContent.trim() !== card.content) {
      onContentChange(card._id, editContent.trim())
    }
    setShowInput(false)
    setIsEditing(false)
  }

  const handleContentKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleContentSubmit()
    } else if (e.key === 'Escape') {
      setEditContent(card.content || '')
      setShowInput(false)
      setIsEditing(false)
    }
  }

  const handleCardClick = () => {
    if (!isEditing) {
      setShowInput(true)
      setIsEditing(true)
      setEditContent(card.content || '')
    }
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnter={handleDragEnter}
      data-card-id={card._id}
      className="bg-gray-600 rounded-xl shadow hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group relative flex flex-col border border-gray-500"
    >
      {/* Creator Bar */}
      <div
        className="h-10 rounded-t-xl flex items-center px-3 justify-between flex-shrink-0"
        style={{ backgroundColor: card.creatorColor }}
      >
        <div className="flex items-center gap-2">
          {card.creatorAvatar && card.creatorAvatar.startsWith('/uploads/') ? (
            <img
              src={card.creatorAvatar}
              alt={card.creatorName}
              className="w-6 h-6 rounded-full object-cover bg-white/20"
            />
          ) : card.creatorAvatar ? (
            <span className="text-xl bg-white/20 rounded-full w-6 h-6 flex items-center justify-center">{card.creatorAvatar}</span>
          ) : (
            <span className="text-lg">{card.creatorName?.charAt(0)}</span>
          )}
          <span className="text-white text-sm font-medium truncate">
            {card.creatorName}
          </span>
        </div>
        {card.status === 'green' && (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {card.status === 'red' && (
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
        {card.status === 'gray' && (
          <div className="w-6 h-6 bg-yellow-500 flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}>
            <svg className="w-4 h-4 text-gray-600 flex-shrink-0 -mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01" />
            </svg>
          </div>
        )}
      </div>

      {/* Status Color Bar - Wider */}
      <div
        className="h-8 cursor-pointer transition-colors hover:opacity-80 flex-shrink-0 flex items-center justify-center"
        style={{ backgroundColor: STATUS_COLORS[card.status] }}
        onClick={handleStatusClick}
        title="点击切换状态"
      >
        <span className="text-white text-sm font-medium">{STATUS_LABELS[card.status]}</span>
      </div>

      {/* Content Area */}
      <div className="p-3 min-h-[60px]" onClick={handleCardClick}>
        {showInput ? (
          <textarea
            ref={inputRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleContentSubmit}
            onKeyDown={handleContentKeyDown}
            placeholder="输入任务内容..."
            className="w-full h-full resize-none border border-gray-400 rounded-lg px-2 py-1 text-sm text-white bg-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="text-sm text-white break-words whitespace-pre-wrap">
            {card.content || '点击添加任务内容...'}
          </p>
        )}
      </div>

      {/* Card Actions */}
      <div className="absolute top-2 right-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        {showMenu && (
          <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border py-1 min-w-[120px] z-10 card-menu">
            <button
              onClick={handleStatusClick}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[card.status] }} />
              切换状态
            </button>
            {isOwner && (
              <button
                onClick={handleDelete}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除任务
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
