import React, { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/common/Header'
import Dashboard from './components/Dashboard/Dashboard'
import ServiceDetailPage from './components/ServiceDetail/ServiceDetailPage'
import SocPage from './components/SocPage/SocPage'
import Login from './components/Admin/Login'
import AdminDashboard from './components/Admin/AdminDashboard'

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, avgLatency: 0, todayIncidents: 0 })
  const [offlineList, setOfflineList] = useState([])
  const [token, setToken] = useState(localStorage.getItem('adminToken') || null)
  
  const location = useLocation()
  const isSocPage = location.pathname === '/soc'

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  const handleLogin = (t) => { setToken(t); localStorage.setItem('adminToken', t) }
  const handleLogout = () => { setToken(null); localStorage.removeItem('adminToken') }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {!isSocPage && (
        <>
          <Header theme={theme} toggleTheme={toggleTheme} stats={stats} token={token} onLogout={handleLogout} />
          {/* Sticky offline banner - always visible when scrolling */}
          {offlineList.length > 0 && (
            <div className="sticky top-16 z-30 bg-red-600 dark:bg-red-800 text-white px-4 py-2 flex items-center justify-center text-sm shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
              <span className="font-bold mr-2">🚨 {offlineList.length} dịch vụ đang sự cố:</span>
              <span>{offlineList.map(s => s.name).join(' • ')}</span>
            </div>
          )}
        </>
      )}
      <Routes>
        <Route path="/" element={<Dashboard onStatsUpdate={setStats} onOfflineUpdate={setOfflineList} token={token} />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/service/:id" element={<ServiceDetailPage token={token} />} />
        <Route path="/soc" element={<SocPage theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/admin" element={<AdminDashboard token={token} />} />
      </Routes>
      {!isSocPage && (
        <footer className="bg-gray-900 border-t border-gray-800 py-6 mt-auto">
          <div className="mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <img src="/logo.png" alt="VNU Logo" className="w-8 h-8 rounded" />
                  <span className="text-white font-bold">VNU Status</span>
                </div>
                <p className="text-gray-400 text-xs">© 2026 VNU Status - ĐHQGHN. Phát triển bởi DUAC.</p>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm mb-2">Liên hệ</h3>
                <p className="text-gray-400 text-xs">📍 144 Xuân Thủy, Cầu Giấy, HN</p>
                <p className="text-gray-400 text-xs">📧 support@example.com</p>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm mb-2">Thống kê</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-800 rounded p-2 text-center">
                    <div className="text-lg font-bold text-blue-400">{stats.online}</div>
                    <div className="text-[10px] text-gray-400">Online</div>
                  </div>
                  <div className="bg-gray-800 rounded p-2 text-center">
                    <div className="text-lg font-bold text-red-400">{stats.todayIncidents || 0}</div>
                    <div className="text-[10px] text-gray-400">Sự cố hôm nay</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-3 text-center">
              <p className="text-gray-500 text-[10px]">Giám sát 24/7 — Auto-refresh mỗi 10 giây</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}

export default App
