import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSSE } from '../../hooks/useApi'
import ServiceCard from './ServiceCard'
import ServiceEditModal from '../Admin/ServiceEditModal'

export default function Dashboard({ onStatsUpdate, onOfflineUpdate, token }) {
  const [services, setServices] = useState({})
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, avgLatency: 0 })
  const [sslStats, setSslStats] = useState({ expiring: 0, error: 0 })
  const [editingService, setEditingService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('all')
  
  const sseData = useSSE('/sse/status')

  const fetchData = async () => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const res = await fetch('/api/services', { headers })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setServices(data.services || {})
      const s = data.stats || stats
      setStats(s)
      onStatsUpdate && onStatsUpdate(s)
      
      const offline = []
      let sslExpCount = 0
      let sslErrCount = 0
      Object.values(data.services || {}).forEach(list => {
        list.forEach(svc => { 
          if (!svc.isOnline) offline.push(svc) 
          if (svc.sslDaysRemaining !== undefined) {
             if (svc.sslExpired || svc.lastSslError) sslErrCount++
             else if (svc.sslDaysRemaining <= 15) sslExpCount++
          }
        })
      })
      onOfflineUpdate && onOfflineUpdate(offline)
      setSslStats({ expiring: sslExpCount, error: sslErrCount })
      setLoading(false)
    } catch (err) {
      console.error('Fetch error:', err)
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [token])
  useEffect(() => { const i = setInterval(fetchData, 10000); return () => clearInterval(i) }, [token])

  useEffect(() => {
    const handleRefresh = () => fetchData()
    window.addEventListener('refresh-data', handleRefresh)
    return () => window.removeEventListener('refresh-data', handleRefresh)
  }, [token])

  // SSE live updates
  useEffect(() => {
    if (!sseData || !sseData.payload) return
    if (sseData.type === 'single') {
      const u = sseData.payload
      setServices(prev => {
        const ns = { ...prev }
        for (const [cat, list] of Object.entries(ns)) {
          ns[cat] = list.map(s => s.id === u.id ? { ...s, ...u } : s)
        }
        return ns
      })
    }
  }, [sseData])

  if (loading) return <main className="flex-grow flex justify-center items-center"><div className="text-gray-500">Đang tải dữ liệu...</div></main>

  return (
    <main className="flex-grow px-4 md:px-6 py-4">
      {/* Mobile Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4 md:hidden">
        <div className="bg-gray-200 dark:bg-gray-800 rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-500">📌 Total</div>
          <div className="font-bold text-sm">{stats.total}</div>
        </div>
        <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-2 text-center">
          <div className="text-[10px] text-green-600">✅ Online</div>
          <div className="font-bold text-green-700 dark:text-green-400 text-sm">{stats.online}</div>
        </div>
        <div className={`${stats.offline > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-200 dark:bg-gray-800'} rounded-lg p-2 text-center`}>
          <div className={`text-[10px] ${stats.offline > 0 ? 'text-red-600' : 'text-gray-500'}`}>❌ Offline</div>
          <div className={`font-bold ${stats.offline > 0 ? 'text-red-700 dark:text-red-400' : ''} text-sm`}>{stats.offline}</div>
        </div>
        <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 text-center">
          <div className="text-[10px] text-blue-600">⚡ Avg</div>
          <div className="font-bold text-blue-700 dark:text-blue-400 text-sm">{stats.avgLatency}s</div>
        </div>
      </div>
      
      {/* Category Filter */}
      <div className="mb-4 flex justify-end">
        <select 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        >
          <option value="all">Hiển thị Tất cả (Mặc định)</option>
          <option value="general">Chỉ Dịch vụ chung</option>
          <option value="student">Chỉ Dành cho Sinh viên</option>
          <option value="staff">Chỉ Dành cho Cán bộ</option>
        </select>
      </div>
      
      {/* Small Inline SSL Warning for Normal Users/Admin */}
      {(sslStats.expiring > 0 || sslStats.error > 0) && (
        <div className="mb-4 text-xs font-bold text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-2 rounded-lg inline-flex items-center">
          ⚠️ Có {sslStats.expiring + sslStats.error} dịch vụ cảnh báo SSL
        </div>
      )}

      {/* General Services - full width grid */}
      {(filterCategory === 'all' || filterCategory === 'general') && services.general && services.general.length > 0 && (
        <div className="mb-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Dịch vụ chung <span className="ml-2 text-sm font-normal text-gray-500">({services.general.length})</span>
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {services.general.map(s => <ServiceCard key={s.id} service={s} isAdmin={!!token} onEdit={() => setEditingService(s)} />)}
          </div>
        </div>
      )}

      {/* Student & Staff side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {(filterCategory === 'all' || filterCategory === 'student') && services.student && services.student.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              🎓 Sinh viên <span className="ml-2 text-sm font-normal text-gray-500">({services.student.length})</span>
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {services.student.map(s => <ServiceCard key={s.id} service={s} isAdmin={!!token} onEdit={() => setEditingService(s)} />)}
            </div>
          </div>
        )}
        {(filterCategory === 'all' || filterCategory === 'staff') && services.staff && services.staff.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              👔 Cán bộ <span className="ml-2 text-sm font-normal text-gray-500">({services.staff.length})</span>
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {services.staff.map(s => <ServiceCard key={s.id} service={s} isAdmin={!!token} onEdit={() => setEditingService(s)} />)}
            </div>
          </div>
        )}
      </div>

      {/* Internal - only admin */}
      {token && services.internal && services.internal.length > 0 && (
        <div className="mb-5">
          <h2 className="text-base font-bold text-yellow-600 dark:text-yellow-400 mb-2 flex items-center">
            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
            🔒 Nội bộ <span className="ml-2 text-sm font-normal text-gray-500">({services.internal.length})</span>
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {services.internal.map(s => <ServiceCard key={s.id} service={s} isAdmin={!!token} onEdit={() => setEditingService(s)} />)}
          </div>
        </div>
      )}

      {editingService && (
        <ServiceEditModal service={editingService} token={token} onClose={() => setEditingService(null)} onSave={() => { setEditingService(null); fetchData() }} />
      )}
    </main>
  )
}
