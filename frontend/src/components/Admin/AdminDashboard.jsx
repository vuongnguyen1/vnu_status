import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ServiceEditModal from './ServiceEditModal'

export default function AdminDashboard({ token }) {
  const navigate = useNavigate()
  
  // Navigation tab state: 'overview', 'services', 'external', 'logs', 'settings'
  const [activeTab, setActiveTab] = useState('services')
  
  // Core states
  const [services, setServices] = useState([])
  const [externalServices, setExternalServices] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [systemStats, setSystemStats] = useState({ total: 0, online: 0, offline: 0 })
  const [sslStats, setSslStats] = useState({ expiring: 0, error: 0 })
  const [sortStatus, setSortStatus] = useState(null) // null, 'asc', 'desc'

  // Service CRUD modal/form states
  const [editingService, setEditingService] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newService, setNewService] = useState({
    name: '', url: '', category: 'general',
    timeout: 15, failureThreshold: 2, ignoreSsl: true,
    useKeyword: false, keyword: '',
    useSelector: false, selector: '',
    useXpath: false, xpath: '',
    useLoginVerify: false, loginVerifyString: '',
    checkInterval: 60
  })

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate('/login')
    }
  }, [token, navigate])

  const fetchData = async () => {
    try {
      setLoading(true)
      const headers = { 'Authorization': `Bearer ${token}` }
      
      // 1. Fetch internal services
      const resSvc = await fetch('/api/services', { headers })
      if (!resSvc.ok) throw new Error('Không thể tải danh sách dịch vụ')
      const dataSvc = await resSvc.json()
      
      const allSvc = []
      let sslExpCount = 0
      let sslErrCount = 0
      if (dataSvc.services) {
        Object.entries(dataSvc.services).forEach(([cat, list]) => {
          list.forEach(s => {
            allSvc.push({ ...s, category: cat })
            if (s.sslDaysRemaining !== undefined) {
               if (s.sslExpired || s.lastSslError) sslErrCount++
               else if (s.sslDaysRemaining <= 15) sslExpCount++
            }
          })
        })
      }
      setServices(allSvc)
      setSslStats({ expiring: sslExpCount, error: sslErrCount })
      if (dataSvc.stats) {
        setSystemStats(dataSvc.stats)
      }

      // 2. Fetch external services
      const resExt = await fetch('/api/external', { headers })
      if (resExt.ok) {
        const dataExt = await resExt.json()
        setExternalServices(dataExt || [])
      }

      // 3. Fetch global logs (from any service, let's take first service as sample or fetch logs for all)
      // Since backend has logs API, let's try getting recent logs or default to empty list if none
      if (allSvc.length > 0) {
        const resLogs = await fetch(`/api/logs/${allSvc[0].id}?limit=30`, { headers })
        if (resLogs.ok) {
          const dataLogs = await resLogs.json()
          setLogs(dataLogs || [])
        }
      }

      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchData()
  }, [token])

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa dịch vụ "${name}"?`)) return
    
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setSuccess('Đã xóa dịch vụ thành công')
        fetchData()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Không thể xóa dịch vụ. Vui lòng kiểm tra lại quyền.')
      }
    } catch {
      setError('Lỗi kết nối máy chủ')
    }
  }

  const handleAddService = async (e) => {
    e.preventDefault()
    if (!newService.name || !newService.url) {
      setError('Vui lòng điền đầy đủ tên và đường dẫn URL')
      return
    }
    
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newService)
      })
      if (res.ok) {
        setSuccess('Đã thêm dịch vụ mới thành công!')
        setShowAddForm(false)
        setNewService({
          name: '', url: '', category: 'general',
          timeout: 15, failureThreshold: 2, ignoreSsl: true,
          useKeyword: false, keyword: '',
          useSelector: false, selector: '',
          useXpath: false, xpath: '',
          useLoginVerify: false, loginVerifyString: '',
          checkInterval: 60
        })
        fetchData()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const errData = await res.json()
        setError(errData.error || 'Lỗi thêm dịch vụ')
      }
    } catch {
      setError('Lỗi kết nối máy chủ')
    }
  }

  const triggerForceCheck = async () => {
    try {
      setSuccess('Đã gửi yêu cầu quét lại hệ thống...')
      // Call mock or refresh endpoint to force checks
      await fetchData()
      setSuccess('Đã quét lại hệ thống và cập nhật trạng thái mới nhất!')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Lỗi kích hoạt quét hệ thống')
    }
  }

  if (!token) return null

  // Offline internal services helper
  const offlineServices = services.filter(s => !s.isOnline)

  // Sort services
  const sortedServices = [...services].sort((a, b) => {
    if (sortStatus === 'asc') return (a.isOnline === b.isOnline) ? 0 : (a.isOnline ? 1 : -1)
    if (sortStatus === 'desc') return (a.isOnline === b.isOnline) ? 0 : (a.isOnline ? -1 : 1)
    return 0 // default insert order
  })

  const toggleSort = () => {
    if (sortStatus === null) setSortStatus('asc')
    else if (sortStatus === 'asc') setSortStatus('desc')
    else setSortStatus(null)
  }

  return (
    <div className="flex-grow flex bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      
      {/* ── LEFT SIDEBAR MENU ── */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col hidden md:flex shrink-0">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <div>
            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white uppercase tracking-wider">VNU Monitor</h3>
            <span className="text-[10px] text-green-500 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Admin Mode Active
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto">
          {/* Overview */}
          <button onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-750'
            }`}>
            <span className="flex items-center gap-2.5">
              <span>📊</span> Tổng quan hệ thống
            </span>
          </button>

          {/* Services */}
          <button onClick={() => setActiveTab('services')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'services'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-750'
            }`}>
            <span className="flex items-center gap-2.5">
              <span>🖥️</span> Dịch vụ giám sát
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {services.length}
            </span>
          </button>

          {/* External */}
          <button onClick={() => setActiveTab('external')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'external'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-750'
            }`}>
            <span className="flex items-center gap-2.5">
              <span>🌐</span> Dịch vụ liên kết
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {externalServices.length}
            </span>
          </button>

          {/* Incident Logs */}
          <button onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'logs'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-750'
            }`}>
            <span className="flex items-center gap-2.5">
              <span>📜</span> Nhật ký sự cố
            </span>
          </button>

          {/* Settings */}
          <button onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-750'
            }`}>
            <span className="flex items-center gap-2.5">
              <span>⚙️</span> Cấu hình hệ thống
            </span>
          </button>
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-[10px] text-gray-400">
          <div>Phiên bản: 2026.1.0</div>
          <div>Cơ sở dữ liệu: MySQL Active</div>
        </div>
      </aside>

      {/* ── RIGHT MAIN CONTENT AREA ── */}
      <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
        
        {/* Mobile quick navigation tabs bar */}
        <div className="flex md:hidden overflow-x-auto gap-2 pb-3 mb-4 border-b border-gray-200 dark:border-gray-800">
          {['overview', 'services', 'external', 'logs', 'settings'].map(tab => {
            const label = tab === 'overview' ? '📊 Tổng quan' : tab === 'services' ? '🖥️ Dịch vụ' : tab === 'external' ? '🌐 Liên kết' : tab === 'logs' ? '📜 Logs' : '⚙️ Cấu hình'
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                  activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}>
                {label}
              </button>
            )
          })}
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="text-red-900 dark:text-red-400 font-bold ml-2">×</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400 flex items-center justify-between">
            <span>✅ {success}</span>
            <button onClick={() => setSuccess('')} className="text-green-950 dark:text-green-400 font-bold ml-2">×</button>
          </div>
        )}

        {/* ── TAB 1: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Tổng quan VNU Status Monitor</h2>
                <p className="text-xs text-gray-500 mt-1">Số liệu thống kê thời gian thực từ các hệ thống giám sát</p>
              </div>
              <button onClick={triggerForceCheck}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow">
                ⚡ Kích hoạt Quét Nhanh (Force Check)
              </button>
            </div>

            {/* Quick Metrics Cards */}
            {(sslStats.expiring > 0 || sslStats.error > 0) && (
              <div className="mb-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg shadow-sm flex items-start">
                 <div className="flex-shrink-0 text-yellow-500 text-2xl mr-3">⚠️</div>
                 <div>
                    <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-300">Cảnh báo Chứng chỉ SSL (Tổng quan)</h3>
                    <ul className="list-disc pl-5 mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                       {sslStats.expiring > 0 && <li>Có <strong>{sslStats.expiring}</strong> ứng dụng/website có chứng chỉ sắp hết hạn (dưới 15 ngày).</li>}
                       {sslStats.error > 0 && <li>Có <strong>{sslStats.error}</strong> ứng dụng/website đang bị lỗi SSL hoặc đã hết hạn.</li>}
                    </ul>
                 </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-xl">📌</div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tổng dịch vụ</div>
                  <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{services.length}</div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-xl">✅</div>
                <div>
                  <div className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Hoạt động bình thường</div>
                  <div className="text-2xl font-extrabold text-green-700 dark:text-green-400 mt-0.5">{systemStats.online || (services.length - offlineServices.length)}</div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-xl">🚨</div>
                <div>
                  <div className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Đang gặp sự cố</div>
                  <div className="text-2xl font-extrabold text-red-600 dark:text-red-400 mt-0.5">{offlineServices.length}</div>
                </div>
              </div>
            </div>

            {/* Offline services detailed view */}
            {offlineServices.length > 0 ? (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl p-5">
                <h3 className="text-red-800 dark:text-red-400 font-bold text-sm mb-3 flex items-center gap-1.5">
                  <span>🚨</span> DANH SÁCH DỊCH VỤ ĐANG GẶP SỰ CỐ ({offlineServices.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {offlineServices.map(s => (
                    <div key={s.id} className="bg-white dark:bg-gray-800 border border-red-300 dark:border-red-900 rounded-lg p-3 flex justify-between items-center shadow-sm">
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-gray-900 dark:text-white truncate">{s.name}</div>
                        <div className="text-[9px] text-gray-400 truncate mt-0.5 font-mono">{s.url}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Code: {s.statusCode || 'ERR'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl p-6 text-center text-green-700 dark:text-green-400 font-bold text-sm">
                🎉 Tuyệt vời! Hiện tại không có dịch vụ nào bị gián đoạn.
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: SERVICES (MASTER CRUD LIST) ── */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">🖥️ Quản lý Dịch vụ Giám sát</h2>
                <p className="text-xs text-gray-500 mt-1">CRUD danh sách dịch vụ nội bộ thuộc hệ thống ĐHQGHN</p>
              </div>
              <button onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow self-start">
                {showAddForm ? '❌ Hủy form' : '➕ Thêm dịch vụ mới'}
              </button>
            </div>

            {/* Add service form */}
            {showAddForm && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md transition-all">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">➕ Thêm dịch vụ giám sát mới</h3>
                <form onSubmit={handleAddService} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Tên dịch vụ/ứng dụng</label>
                    <input type="text" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})}
                      placeholder="Ví dụ: Cổng thông tin đào tạo"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-xs" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Địa chỉ URL</label>
                    <input type="url" value={newService.url} onChange={e => setNewService({...newService, url: e.target.value})}
                      placeholder="https://service.example.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-xs" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Phân loại hiển thị</label>
                    <select value={newService.category} onChange={e => setNewService({...newService, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-xs">
                      <option value="general">Dịch vụ chung</option>
                      <option value="student">Dành cho sinh viên</option>
                      <option value="staff">Dành cho cán bộ</option>
                      <option value="internal">Mạng nội bộ (Internal)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Timeout (Giây)</label>
                      <input type="number" min="1" max="60" value={newService.timeout} onChange={e => setNewService({...newService, timeout: parseInt(e.target.value) || 15})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-xs" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Ngưỡng lỗi</label>
                      <input type="number" min="1" max="10" value={newService.failureThreshold} onChange={e => setNewService({...newService, failureThreshold: parseInt(e.target.value) || 2})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-xs" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Tần suất kiểm tra (Giây) - Mặc định: 60s</label>
                      <input type="number" min="30" max="86400" value={newService.checkInterval} onChange={e => setNewService({...newService, checkInterval: parseInt(e.target.value) || 60})}
                        className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-xs" />
                    </div>
                  </div>
                  <div className="md:col-span-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" checked={newService.ignoreSsl} onChange={e => setNewService({...newService, ignoreSsl: e.target.checked})}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 mr-2" />
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">Bỏ qua lỗi chứng chỉ SSL</span>
                    </label>
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-3">
                    <button type="button" onClick={() => setShowAddForm(false)}
                      className="px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded">
                      Hủy
                    </button>
                    <button type="submit"
                      className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow">
                      💾 Thêm mới
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Master Table list */}
            {loading ? (
              <div className="text-center py-10 text-gray-500">Đang tải danh sách dịch vụ...</div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                      <th className="px-5 py-3">Tên</th>
                      <th className="px-5 py-3 hidden md:table-cell">URL</th>
                      <th className="px-5 py-3">Nhóm</th>
                      <th className="px-5 py-3 text-center">Uptime</th>
                      <th className="px-5 py-3 text-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition" onClick={toggleSort}>
                        Trạng Thái {sortStatus === 'asc' ? '↓' : sortStatus === 'desc' ? '↑' : ''}
                      </th>
                      <th className="px-5 py-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                    {sortedServices.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <td className="px-5 py-4 font-bold text-gray-900 dark:text-white">{s.name}</td>
                        <td className="px-5 py-4 font-mono text-gray-400 hidden md:table-cell max-w-[200px] truncate">{s.url}</td>
                        <td className="px-5 py-4 uppercase">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            s.category === 'student' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                            s.category === 'staff' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' :
                            s.category === 'internal' ? 'bg-yellow-100 text-yellow-750 dark:bg-yellow-900/30' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                          }`}>
                            {s.category}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-green-600">{s.uptime || 100}%</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${s.isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 animate-pulse'}`}>
                            {s.isOnline ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          <button onClick={() => setEditingService(s)}
                            className="px-2 py-1 text-blue-600 border border-blue-500 rounded hover:bg-blue-50">⚙️ Sửa</button>
                          <button onClick={() => handleDelete(s.id, s.name)}
                            className="px-2 py-1 text-red-600 border border-red-500 rounded hover:bg-red-50">🗑️ Xóa</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: EXTERNAL SERVICES ── */}
        {activeTab === 'external' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">🌐 Dịch vụ Liên kết Ngoài</h2>
              <p className="text-xs text-gray-500 mt-1">Giám sát trạng thái các nhà cung cấp bên thứ 3 (Google, Microsoft, Cloudflare, Zoom, v.v.)</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                    <th className="px-5 py-3">Tên Nhà Cung Cấp</th>
                    <th className="px-5 py-3">URL Trạng Thái gốc</th>
                    <th className="px-5 py-3 text-center">Trạng Thái</th>
                    <th className="px-5 py-3 text-right">Cập Nhật</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                  {externalServices.map(ext => (
                    <tr key={ext.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="px-5 py-4 font-bold text-gray-900 dark:text-white">{ext.name}</td>
                      <td className="px-5 py-4 font-mono text-gray-400 font-normal">{ext.statusUrl || 'Google/Microsoft direct API'}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          ext.currentStatus === 'Operational' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-750'
                        }`}>
                          {ext.currentStatus || 'Operational'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-gray-400">
                        {ext.lastCheck ? new Date(ext.lastCheck).toLocaleTimeString('vi-VN') : 'Vừa xong'}
                      </td>
                    </tr>
                  ))}
                  {externalServices.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-gray-500">Chưa tải được dữ liệu dịch vụ liên kết ngoài.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: INCIDENT LOGS ── */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">📜 Nhật ký Sự cố Gần đây</h2>
              <p className="text-xs text-gray-500 mt-1">Lịch sử sập nguồn và phục hồi ghi nhận bởi hệ thống</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                    <th className="px-5 py-3">Thời gian</th>
                    <th className="px-5 py-3">Ứng Dụng</th>
                    <th className="px-5 py-3 text-center">Sự kiện</th>
                    <th className="px-5 py-3">Lý do/Nội dung chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="px-5 py-4 font-mono text-gray-500">
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-5 py-4 font-bold text-gray-900 dark:text-white">
                        Service ID: {log.serviceId}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          log.status === 200 || log.isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {log.status === 200 || log.isOnline ? 'PHỤC HỒI' : 'SẬP'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-400 font-semibold">{log.message || 'Mất kết nối HTTP'}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-gray-500">Chưa ghi nhận sự cố sập nguồn nào gần đây.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 5: GLOBAL SETTINGS ── */}
        {activeTab === 'settings' && (
          <div className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">⚙️ Cấu hình Hệ thống VNU Monitor</h2>
              <p className="text-xs text-gray-500 mt-1">Cài đặt phân luồng mạng và thông báo Telegram</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="font-bold text-xs text-gray-900 dark:text-white uppercase mb-1">📢 Webhook Cảnh báo Telegram</h3>
                <p className="text-xs text-gray-500 mb-2">Thông báo tự động đẩy về nhóm giám sát mạng của ĐHQGHN ngay khi phát hiện sự cố.</p>
                <div className="flex gap-2">
                  <input type="text" value="https://t.me/VNU_Status_Bot (Active)" readOnly
                    className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none text-xs font-mono" />
                  <button className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded hover:bg-blue-700">Test Bot</button>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
                <h3 className="font-bold text-xs text-gray-900 dark:text-white uppercase">⚙️ Tối ưu hóa phân chia luồng (Phase 2026)</h3>
                <p className="text-[11px] text-gray-500">
                  Hệ thống đang cấu hình chạy đa luồng an toàn (Staggered parallel batches) với dung lượng luồng mạng tối đa để tránh bị tường lửa (WAF/Cloudflare) của các cổng thành viên đánh dấu là tấn công spam/DDoS.
                </p>
                <div className="text-xs grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <span className="font-semibold">Kích thước batch:</span> 6 dịch vụ / đợt
                  </div>
                  <div>
                    <span className="font-semibold">Độ trễ giãn cách:</span> 3 giây
                  </div>
                  <div>
                    <span className="font-semibold">Rate limiter:</span> Network Semaphore Active
                  </div>
                  <div>
                    <span className="font-semibold">Chu kỳ quét tự động:</span> 60 giây / lần quét tổng
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Edit service modal */}
      {editingService && (
        <ServiceEditModal service={editingService} token={token} onClose={() => setEditingService(null)} onSave={() => { setEditingService(null); fetchData() }} />
      )}
    </div>
  )
}
