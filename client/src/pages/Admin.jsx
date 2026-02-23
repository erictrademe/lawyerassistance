import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
]

const USER_AVATARS = [
  { id: '1', emoji: '🐱', name: '猫咪' },
  { id: '2', emoji: '🐶', name: '小狗' },
  { id: '3', emoji: '🐰', name: '兔子' },
  { id: '4', emoji: '🐼', name: '熊猫' },
  { id: '5', emoji: '🦊', name: '狐狸' },
  { id: '6', emoji: '🐻', name: '小熊' },
  { id: '7', emoji: '🐨', name: '考拉' },
  { id: '8', emoji: '🦁', name: '狮子' },
  { id: '9', emoji: '🐸', name: '青蛙' },
  { id: '10', emoji: '🦄', name: '独角兽' },
  { id: '11', emoji: '🐯', name: '老虎' },
  { id: '12', emoji: '🐙', name: '章鱼' }
]

export default function Admin() {
  const [columns, setColumns] = useState([])
  const [users, setUsers] = useState([])
  const [activeTab, setActiveTab] = useState('columns')
  const [newColumnName, setNewColumnName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('user')
  const [newUserColor, setNewUserColor] = useState(USER_COLORS[0])
  const [newUserAvatar, setNewUserAvatar] = useState('')
  const [editingColumnId, setEditingColumnId] = useState(null)
  const [editingColumnName, setEditingColumnName] = useState('')
  const [editingUser, setEditingUser] = useState(null)
  const [editUserData, setEditUserData] = useState({ username: '', color: '', avatar: '' })
  const [loading, setLoading] = useState(true)
  const [deletedCards, setDeletedCards] = useState([])
  const [selectedUserForDeleted, setSelectedUserForDeleted] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingNewAvatar, setUploadingNewAvatar] = useState(false)
  const avatarInputRef = useRef(null)
  const newAvatarInputRef = useRef(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: { 'x-user-id': user?._id }
  })

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      const [columnsRes, usersRes] = await Promise.all([
        api.get('/columns'),
        api.get('/users')
      ])
      setColumns(columnsRes.data)
      setUsers(usersRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDeletedCards = async (creatorId = '') => {
    try {
      const url = creatorId ? `/deleted-cards?creatorId=${creatorId}` : '/deleted-cards'
      const response = await api.get(url)
      setDeletedCards(response.data)
    } catch (error) {
      console.error('Failed to fetch deleted cards:', error)
    }
  }

  const handleAddColumn = async (e) => {
    e.preventDefault()
    if (!newColumnName.trim()) return

    try {
      const response = await api.post('/columns', { name: newColumnName })
      setColumns([...columns, response.data])
      setNewColumnName('')
    } catch (error) {
      alert(error.response?.data?.error || '添加失败')
    }
  }

  const handleEditColumn = (column) => {
    setEditingColumnId(column._id)
    setEditingColumnName(column.name)
  }

  const handleSaveColumn = async (columnId) => {
    if (!editingColumnName.trim()) return

    try {
      const response = await api.put(`/columns/${columnId}`, { name: editingColumnName })
      setColumns(columns.map(c => c._id === columnId ? response.data : c))
      setEditingColumnId(null)
      setEditingColumnName('')
    } catch (error) {
      alert(error.response?.data?.error || '更新失败')
    }
  }

  const handleDeleteColumn = async (columnId) => {
    if (!window.confirm('删除列将同时删除该列下的所有任务，确定要删除吗？')) return

    try {
      await api.delete(`/columns/${columnId}`)
      setColumns(columns.filter(c => c._id !== columnId))
    } catch (error) {
      alert(error.response?.data?.error || '删除失败')
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!newUsername.trim() || !newPassword.trim()) return

    try {
      const response = await api.post('/users', {
        username: newUsername,
        password: newPassword,
        role: newRole,
        color: newUserColor,
        avatar: newUserAvatar
      })
      setUsers([...users, response.data])
      setNewUsername('')
      setNewPassword('')
      setNewRole('user')
      // Move to next color
      const currentIndex = USER_COLORS.indexOf(newUserColor)
      setNewUserColor(USER_COLORS[(currentIndex + 1) % USER_COLORS.length])
      setNewUserAvatar('')
    } catch (error) {
      alert(error.response?.data?.error || '添加失败')
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('确定要删除这个用户吗？该用户创建的所有任务也将被删除。')) return

    try {
      await api.delete(`/users/${userId}`)
      setUsers(users.filter(u => u._id !== userId))
    } catch (error) {
      alert(error.response?.data?.error || '删除失败')
    }
  }

  const handleEditUser = (userItem) => {
    setEditingUser(userItem._id)
    setEditUserData({
      username: userItem.username,
      color: userItem.color,
      avatar: userItem.avatar || ''
    })
  }

  const handleSaveUser = async (userId) => {
    if (!editUserData.username.trim()) return

    try {
      const response = await api.put(`/users/${userId}`, {
        username: editUserData.username,
        color: editUserData.color,
        avatar: editUserData.avatar
      })
      setUsers(users.map(u => u._id === userId ? response.data : u))
      setEditingUser(null)
      setEditUserData({ username: '', color: '', avatar: '' })
    } catch (error) {
      alert(error.response?.data?.error || '更新失败')
    }
  }

  const handleCancelEditUser = () => {
    setEditingUser(null)
    setEditUserData({ username: '', color: '', avatar: '' })
  }

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await api.post('/upload/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setEditUserData({ ...editUserData, avatar: response.data.url })
    } catch (error) {
      alert(error.response?.data?.error || '上传图片失败')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) {
        avatarInputRef.current.value = ''
      }
    }
  }

  const handleNewUserAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingNewAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await api.post('/upload/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setNewUserAvatar(response.data.url)
    } catch (error) {
      alert(error.response?.data?.error || '上传图片失败')
    } finally {
      setUploadingNewAvatar(false)
      if (newAvatarInputRef.current) {
        newAvatarInputRef.current.value = ''
      }
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
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
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-primary-800 shadow-lg z-50">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-white font-semibold text-lg">系统管理</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/board')}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
            >
              返回看板
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="退出登录"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-20 px-4 pb-8">
        {/* Tabs */}
        <div className="max-w-4xl mx-auto mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('columns')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'columns'
                ? 'bg-primary-700 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            列管理
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-primary-700 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            用户管理
          </button>
          <button
            onClick={() => {
              setActiveTab('deleted')
              fetchDeletedCards()
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'deleted'
                ? 'bg-primary-700 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            已删除卡片
          </button>
        </div>

        {/* Columns Tab */}
        {activeTab === 'columns' && (
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">任务列管理</h2>

            {/* Add Column Form */}
            <form onSubmit={handleAddColumn} className="flex gap-3 mb-6">
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="输入新列名"
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary-700 text-white font-medium rounded-lg hover:bg-primary-700-light transition-colors"
              >
                添加列
              </button>
            </form>

            {/* Columns List */}
            <div className="space-y-2">
              {columns.sort((a, b) => a.order - b.order).map((column, index) => (
                <div
                  key={column._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="w-8 h-8 bg-primary-700 text-white rounded-lg flex items-center justify-center font-semibold flex-shrink-0">
                      {index + 1}
                    </span>
                    {editingColumnId === column._id ? (
                      <input
                        type="text"
                        value={editingColumnName}
                        onChange={(e) => setEditingColumnName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveColumn(column._id)}
                        onBlur={() => handleSaveColumn(column._id)}
                        autoFocus
                        className="flex-1 px-3 py-1 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      />
                    ) : (
                      <span
                        className="font-medium text-gray-800 cursor-pointer hover:text-primary"
                        onClick={() => handleEditColumn(column)}
                      >
                        {column.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingColumnId !== column._id && (
                      <button
                        onClick={() => handleEditColumn(column)}
                        className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                        title="编辑列名"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteColumn(column._id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除列"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">用户管理</h2>

            {/* Add User Form */}
            <form onSubmit={handleAddUser} className="flex flex-wrap gap-3 mb-6">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="用户名"
                className="flex-1 min-w-[150px] px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="初始密码"
                className="w-[150px] px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
              {/* Color Picker */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">颜色:</span>
                <div className="flex gap-1">
                  {USER_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewUserColor(color)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        newUserColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              {/* Avatar Picker */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">头像:</span>
                <div className="flex gap-1 flex-wrap">
                  {USER_AVATARS.map(avatar => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setNewUserAvatar(avatar.emoji)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-transform ${
                        newUserAvatar === avatar.emoji ? 'ring-2 ring-offset-2 ring-primary scale-110 bg-gray-100' : 'hover:scale-110'
                      }`}
                    >
                      {avatar.emoji}
                    </button>
                  ))}
                  <input
                    type="file"
                    ref={newAvatarInputRef}
                    onChange={handleNewUserAvatarUpload}
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => newAvatarInputRef.current?.click()}
                    disabled={uploadingNewAvatar}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs bg-gray-100 hover:bg-gray-200 transition-transform hover:scale-110 border-2 border-dashed border-gray-300"
                  >
                    {uploadingNewAvatar ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                    ) : (
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  {newUserAvatar && newUserAvatar.startsWith('/uploads/') && (
                    <div className="relative">
                      <img
                        src={newUserAvatar}
                        alt="Avatar preview"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setNewUserAvatar('')}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        x
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-700 text-white font-medium rounded-lg hover:bg-primary-700-light transition-colors"
              >
                添加用户
              </button>
            </form>

            {/* Users List */}
            <div className="space-y-2">
              {users.map(userItem => (
                <div
                  key={userItem._id}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {editingUser === userItem._id ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-12">用户名:</span>
                        <input
                          type="text"
                          value={editUserData.username}
                          onChange={(e) => setEditUserData({ ...editUserData, username: e.target.value })}
                          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-12">颜色:</span>
                        <div className="flex gap-1">
                          {USER_COLORS.map(color => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditUserData({ ...editUserData, color })}
                              className={`w-8 h-8 rounded-full transition-transform ${
                                editUserData.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-110'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-12">头像:</span>
                        <div className="flex gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setEditUserData({ ...editUserData, avatar: '' })}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-transform ${
                              editUserData.avatar === '' ? 'ring-2 ring-offset-2 ring-primary scale-110 bg-gray-200' : 'hover:scale-110'
                            }`}
                          >
                            {editUserData.username.charAt(0)}
                          </button>
                          {USER_AVATARS.map(avatar => (
                            <button
                              key={avatar.id}
                              type="button"
                              onClick={() => setEditUserData({ ...editUserData, avatar: avatar.emoji })}
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-transform ${
                                editUserData.avatar === avatar.emoji ? 'ring-2 ring-offset-2 ring-primary scale-110 bg-gray-100' : 'hover:scale-110'
                              }`}
                            >
                              {avatar.emoji}
                            </button>
                          ))}
                          <input
                            type="file"
                            ref={avatarInputRef}
                            onChange={handleAvatarFileChange}
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={uploadingAvatar}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-xs bg-gray-100 hover:bg-gray-200 transition-transform hover:scale-110 border-2 border-dashed border-gray-300"
                          >
                            {uploadingAvatar ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                            ) : (
                              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                          {editUserData.avatar && editUserData.avatar.startsWith('/uploads/') && (
                            <div className="relative">
                              <img
                                src={editUserData.avatar}
                                alt="Avatar preview"
                                className="w-10 h-10 rounded-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => setEditUserData({ ...editUserData, avatar: '' })}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                              >
                                x
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleCancelEditUser}
                          className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => handleSaveUser(userItem._id)}
                          className="px-3 py-1.5 bg-primary-700 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {userItem.avatar && userItem.avatar.startsWith('/uploads/') ? (
                          <img
                            src={userItem.avatar}
                            alt={userItem.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                            style={{ backgroundColor: userItem.color }}
                          >
                            {userItem.avatar || userItem.username.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">{userItem.username}</p>
                          <p className="text-sm text-gray-500">
                            {userItem.role === 'admin' ? '管理员' : '普通用户'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditUser(userItem)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑用户"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {userItem._id !== user?._id && userItem.role !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(userItem._id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除用户"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deleted Cards Tab */}
        {activeTab === 'deleted' && (
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">已删除卡片</h2>

            {/* User Filter */}
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm text-gray-600">筛选用户:</span>
              <select
                value={selectedUserForDeleted}
                onChange={(e) => {
                  setSelectedUserForDeleted(e.target.value)
                  fetchDeletedCards(e.target.value)
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="">全部用户</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.username}</option>
                ))}
              </select>
            </div>

            {/* Deleted Cards List */}
            <div className="space-y-3">
              {deletedCards.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无已删除的卡片</p>
              ) : (
                deletedCards.map(card => (
                  <div
                    key={card._id}
                    className="bg-gray-100 rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                        style={{ backgroundColor: card.creatorColor }}
                      >
                        {card.creatorAvatar || card.creatorName?.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{card.creatorName}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        删除于: {new Date(card.deletedAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="h-6 rounded flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: card.status === 'gray' ? '#718096' : card.status === 'red' ? '#e53e3e' : '#38a169' }}>
                      {card.status === 'gray' ? '有问题' : card.status === 'red' ? '未完成' : '已完成'}
                    </div>
                    <p className="mt-2 text-gray-700 text-sm whitespace-pre-wrap">{card.content || '(无内容)'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
