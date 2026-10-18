import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Header({ theme, toggleTheme, stats, token, onLogout }) {
  const location = useLocation()
  const [isScanning, setIsScanning] = useState(false)

  const handleQuickScan = async () => {
    setIsScanning(true)
    try {
      const headers = { 'Authorization': `Bearer ${token}` }
      const res = await fetch('/api/auth/quick-scan', { method: 'POST', headers })
      if (!res.ok) throw new Error('Failed to scan')
      alert('Đã kích hoạt Quét Nhanh thành công. Kết quả sẽ được cập nhật sau vài giây.')
      window.dispatchEvent(new Event('refresh-data'))
    } catch (err) {
      alert('Lỗi: Không thể kích hoạt Quét Nhanh.')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 backdrop-blur-md bg-opacity-80 dark:bg-opacity-80 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link to="/">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded" />
          </Link>
          <div>
            <Link to="/">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-wide">VNU Status</h1>
            </Link>
            <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Trang trạng thái các ứng dụng ĐHQGHN
            </div>
          </div>
          {/* Navigation */}
          <div className="ml-4 pl-4 border-l border-gray-300 dark:border-gray-700 hidden sm:flex items-center space-x-3">
            <Link to="/soc" className="group flex flex-col justify-center items-start">
              <span className={`text-sm font-bold uppercase tracking-wider transition-colors ${location.pathname === '/soc' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 group-hover:text-blue-600'}`}>
                🛡️ VNU SOC
              </span>
              <span className="text-[9px] text-gray-500 font-medium">Trung tâm giám sát an ninh mạng realtime</span>
            </Link>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Desktop Stats pills */}
          <div className="hidden md:flex items-center space-x-2 text-sm">
            <div className="flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <span className="text-gray-500 text-xs mr-2">📌</span>
              <span className="font-bold text-gray-900 dark:text-white">{stats.total}</span>
            </div>
            <div className="flex items-center px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <span className="text-green-600 text-xs mr-2">✅</span>
              <span className="font-bold text-green-700 dark:text-green-400">{stats.online}</span>
            </div>
            <div className={`flex items-center px-3 py-1.5 rounded-lg ${stats.offline > 0 ? 'bg-red-100' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <span className={`text-xs mr-2 ${stats.offline > 0 ? 'text-red-600' : 'text-gray-500'}`}>❌</span>
              <span className={`font-bold ${stats.offline > 0 ? 'text-red-700' : 'text-gray-700 dark:text-gray-300'}`}>{stats.offline}</span>
            </div>
            <div className="flex items-center px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <span className="text-blue-600 text-xs mr-2">⚡</span>
              <span className="font-bold text-blue-700 dark:text-blue-400">{stats.avgLatency}s</span>
            </div>
          </div>
          
          {/* Theme Toggle */}
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Đổi giao diện">
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>

          {/* Auth */}
          {token ? (
            <div className="flex items-center space-x-2 text-sm">
              <Link to="/admin" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Quản trị</Link>
              <span className="text-gray-400">|</span>
              <button onClick={onLogout} className="text-red-500 hover:text-red-700 text-xs font-semibold">Thoát</button>
            </div>
          ) : (
            <Link to="/login" className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600">Đăng nhập</Link>
          )}

          {/* Admin Actions */}
          {token && (
            <button onClick={handleQuickScan} disabled={isScanning} className="hidden sm:flex items-center px-2 sm:px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-[10px] sm:text-xs rounded-lg transition font-bold shadow-sm disabled:opacity-50">
              {isScanning ? '⏳ Đang quét...' : '⚡ Quét Nhanh'}
            </button>
          )}

          {/* Telegram */}
          <a href="https://t.me/VNU_Status_Bot" target="_blank" rel="noreferrer" className="flex items-center px-2 sm:px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] sm:text-xs rounded-lg transition">
            📢 <span className="hidden sm:inline ml-1">Nhận thông báo</span>
          </a>
        </div>
      </div>
    </header>
  )
}
