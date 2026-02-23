import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import TaskCard from '../components/TaskCard'
import Navbar from '../components/Navbar'

export default function Board() {
  const [columns, setColumns] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedColumnId, setSelectedColumnId] = useState(null)
  const [newCardContent, setNewCardContent] = useState('')
  const { user } = useAuth()
  const draggedCardRef = useRef(null)
  const dragOverCardRef = useRef(null)

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: { 'x-user-id': user?._id }
  })

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      const [columnsRes, cardsRes] = await Promise.all([
        api.get('/columns'),
        api.get('/cards')
      ])
      setColumns(columnsRes.data)
      setCards(cardsRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCardClick = (columnId) => {
    setSelectedColumnId(columnId)
    setNewCardContent('')
    setShowAddModal(true)
  }

  const handleAddCard = async () => {
    if (!selectedColumnId) return

    try {
      const response = await api.post('/cards', {
        columnId: selectedColumnId,
        content: newCardContent.trim()
      })
      setCards([...cards, response.data])
      setShowAddModal(false)
      setNewCardContent('')
      setSelectedColumnId(null)
    } catch (error) {
      console.error('Failed to add card:', error)
    }
  }

  const handleStatusChange = async (cardId, newStatus) => {
    try {
      const response = await api.put(`/cards/${cardId}`, { status: newStatus })
      setCards(cards.map(c => c._id === cardId ? response.data : c))
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleContentChange = async (cardId, newContent) => {
    try {
      const response = await api.put(`/cards/${cardId}`, { content: newContent })
      setCards(cards.map(c => c._id === cardId ? response.data : c))
    } catch (error) {
      console.error('Failed to update content:', error)
    }
  }

  const handleDeleteCard = async (cardId) => {
    try {
      await api.delete(`/cards/${cardId}`)
      setCards(cards.filter(c => c._id !== cardId))
    } catch (error) {
      console.error('Failed to delete card:', error)
    }
  }

  // 拖拽开始
  const handleDragStart = (e, card) => {
    draggedCardRef.current = card
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', card._id)
  }

  // 拖拽进入卡片上方
  const handleDragEnterCard = (e, targetCard) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedCardRef.current) return
    if (draggedCardRef.current._id === targetCard._id) return

    // 获取目标卡片的中心位置
    const cardElement = e.currentTarget
    const rect = cardElement.getBoundingClientRect()
    const cardCenter = rect.top + rect.height / 2

    // 根据鼠标位置判断是放置在目标卡片的上方还是下方
    const mouseY = e.clientY
    const position = mouseY < cardCenter ? 'before' : 'after'

    dragOverCardRef.current = { card: targetCard, position }
  }

  // 拖拽进入列
  const handleDragEnterColumn = (e, columnId) => {
    e.preventDefault()
    if (!draggedCardRef.current) return
  }

  // 拖拽在列上方移动
  const handleDragOverColumn = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  // 拖拽放到列上
  const handleDropOnColumn = async (e, columnId) => {
    e.preventDefault()
    if (!draggedCardRef.current) return

    const draggedCard = draggedCardRef.current
    const targetInfo = dragOverCardRef.current

    let targetColumnId = columnId
    let targetIndex = 0

    if (targetInfo && targetInfo.card) {
      const targetCard = targetInfo.card

      // 获取当前列的卡片（按order排序）
      const columnCards = cards
        .filter(c => c.columnId === columnId)
        .sort((a, b) => a.order - b.order)

      const targetCardIndex = columnCards.findIndex(c => c._id === targetCard._id)
      const draggedIdx = columnCards.findIndex(c => c._id === draggedCard._id)

      // 根据拖拽位置决定目标索引
      if (targetInfo.position === 'before') {
        targetIndex = targetCardIndex
      } else {
        targetIndex = targetCardIndex + 1
      }

      // 如果拖拽的卡片已经在同一列，需要调整索引
      if (draggedIdx !== -1) {
        if (draggedIdx < targetIndex) {
          targetIndex = targetIndex - 1
        }
      }
    } else {
      // 放到了空列或列的空白区域
      const columnCards = cards.filter(c => c.columnId === columnId)
      targetIndex = columnCards.length
    }

    // 如果位置没变，不处理
    if (targetColumnId === draggedCard.columnId) {
      const columnCards = cards
        .filter(c => c.columnId === targetColumnId)
        .sort((a, b) => a.order - b.order)
      const currentIndex = columnCards.findIndex(c => c._id === draggedCard._id)
      if (currentIndex === targetIndex) {
        draggedCardRef.current = null
        dragOverCardRef.current = null
        return
      }
    }

    // 更新本地状态
    const columnCards = cards
      .filter(c => c.columnId === targetColumnId)
      .sort((a, b) => a.order - b.order)

    const otherCards = cards.filter(c => c._id !== draggedCard._id)
    const filteredColumnCards = columnCards.filter(c => c._id !== draggedCard._id)

    // 插入到目标位置
    const newCard = { ...draggedCard, columnId: targetColumnId }
    filteredColumnCards.splice(targetIndex, 0, newCard)

    // 重新分配order
    const updatedColumnCards = filteredColumnCards.map((c, i) => ({ ...c, order: i }))

    // 合并所有卡片
    const otherColumnCards = otherCards.filter(c => c.columnId !== targetColumnId)
    setCards([...otherColumnCards, ...updatedColumnCards])

    // 保存到服务器
    try {
      // 更新被拖拽的卡片
      await api.put(`/cards/${draggedCard._id}`, {
        columnId: targetColumnId,
        order: targetIndex
      })

      // 更新同列其他卡片的order
      for (let i = 0; i < updatedColumnCards.length; i++) {
        const c = updatedColumnCards[i]
        if (c._id !== draggedCard._id) {
          await api.put(`/cards/${c._id}`, { order: i })
        }
      }
    } catch (error) {
      console.error('Failed to update card position:', error)
      fetchData()
    }

    draggedCardRef.current = null
    dragOverCardRef.current = null
  }

  const getColumnCards = (columnId) => {
    return cards
      .filter(c => c.columnId === columnId)
      .sort((a, b) => a.order - b.order)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      <Navbar />

      <div className="pt-20 pb-6 px-4 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {columns.map(column => (
            <div
              key={column._id}
              className="w-72 lg:w-80 flex-shrink-0"
              data-column-id={column._id}
              onDragEnter={(e) => handleDragEnterColumn(e, column._id)}
              onDragOver={handleDragOverColumn}
              onDrop={(e) => handleDropOnColumn(e, column._id)}
            >
              {/* Column Header */}
              <div className="bg-gray-800 rounded-t-xl px-4 py-3 border-b-2 border-gray-600 shadow-md">
                <h3 className="font-semibold text-white text-lg">{column.name}</h3>
                <p className="text-sm text-gray-400">{getColumnCards(column._id).length} 个任务</p>
              </div>

              {/* Cards Container */}
              <div className="bg-gray-700/50 backdrop-blur rounded-b-xl p-3 min-h-[200px] space-y-3">
                {getColumnCards(column._id).map((card) => (
                  <TaskCard
                    key={card._id}
                    card={card}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteCard}
                    onDragStart={(e) => handleDragStart(e, card)}
                    onContentChange={handleContentChange}
                    onDragEnterCard={(e) => handleDragEnterCard(e, card)}
                  />
                ))}

                {/* Add Card Button */}
                <button
                  onClick={() => handleAddCardClick(column._id)}
                  className="w-full py-2.5 flex items-center justify-center gap-2 text-gray-500 hover:text-primary hover:bg-white rounded-lg transition-all border border-dashed border-gray-300 hover:border-primary"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium text-gray-300">添加任务</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">添加新任务</h3>
            <textarea
              value={newCardContent}
              onChange={(e) => setNewCardContent(e.target.value)}
              placeholder="输入任务内容..."
              className="w-full h-32 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewCardContent('')
                  setSelectedColumnId(null)
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddCard}
                className="px-4 py-2 bg-primary-700 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
