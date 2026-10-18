import React from 'react'
import { Link } from 'react-router-dom'

export default function ServiceCard({ service, isAdmin, onEdit }) {
  const isOnline = service.isOnline
  const code = service.statusCode || 0
  const latency_ms = service.responseTime || 0
  const latency_s = (latency_ms / 1000).toFixed(2)

  let latencyColor, latencyIcon
  if (code === 0 || latency_ms === 0) {
    latencyColor = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
    latencyIcon = '🐢'
  } else if (latency_ms < 500) {
    latencyColor = 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
    latencyIcon = '⚡'
  } else if (latency_ms < 2000) {
    latencyColor = 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800'
    latencyIcon = '⚠️'
  } else {
    latencyColor = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
    latencyIcon = '🐢'
  }

  const uptime = service.uptime != null ? service.uptime : 100
  const cardBg = isOnline ? 'bg-white dark:bg-gray-800' : 'bg-red-50 dark:bg-red-950/60'
  const statusBorder = isOnline ? 'border-gray-200 dark:border-gray-700' : 'border-red-500'
  const statusBadge = isOnline
    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
    : 'bg-red-600 text-white border-red-700 animate-pulse'

  const hostname = (() => { try { return new URL(service.url).hostname } catch { return service.url } })()
  
  const formatTime = (d) => {
    if (!d) return '--:--'
    try { return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) } catch { return '--:--' }
  }

  return (
    <Link to={`/service/${service.id}`}
      className={`block ${cardBg} rounded-xl shadow-sm border ${statusBorder} p-3 hover:shadow-md transition-all duration-200 relative overflow-hidden group`}>
      {!isOnline && <div className="absolute top-0 left-0 w-full h-0.5 bg-red-600 animate-pulse"></div>}
      
      {/* Name + Status */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 pr-2 flex-grow">
          <h3 className={`font-bold text-[13px] md:text-sm leading-tight line-clamp-2 min-h-[2.5rem] flex items-center ${isOnline ? 'text-gray-900 dark:text-white' : 'text-red-700 dark:text-red-300'}`} title={service.name}>
            {service.name}
          </h3>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate block mt-1">{hostname}</span>
          {service.sslDaysRemaining !== undefined && service.sslDaysRemaining !== null && service.sslDaysRemaining <= 15 && (
            <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${
              service.sslDaysRemaining <= 0 
                ? 'bg-red-155 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' 
                : 'bg-yellow-100 text-yellow-750 border-yellow-250 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'
            }`}>
              🔒 {service.sslDaysRemaining <= 0 ? 'SSL hết hạn' : `SSL sắp hết hạn (${service.sslDaysRemaining} ngày)`}
            </span>
          )}
        </div>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        <div className={`flex flex-col items-center p-1 rounded border ${latencyColor}`}>
          <span className="text-[8px] uppercase tracking-wider opacity-70">Latency</span>
          <span className="font-bold text-[11px]">{latencyIcon} {code === 0 ? 'Timeout' : latency_s + 's'}</span>
        </div>
        <div className="flex flex-col items-center p-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <span className="text-[8px] uppercase tracking-wider text-gray-500">Uptime</span>
          <span className={`font-bold text-[11px] ${uptime >= 99 ? 'text-green-600' : uptime >= 95 ? 'text-yellow-600' : 'text-red-600'}`}>{uptime}%</span>
        </div>
        <div className="flex flex-col items-center p-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <span className="text-[8px] uppercase tracking-wider text-gray-500">Code</span>
          <span className={`font-bold text-[11px] ${code >= 200 && code < 300 ? 'text-green-600' : 'text-red-600'}`}>{code || 'ERR'}</span>
        </div>
      </div>

      {/* Last check */}
      <div className="text-[9px] text-gray-400 text-right">Check: {formatTime(service.lastCheck)}</div>

      {isAdmin && (
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit() }}
          className="absolute bottom-1 right-1 p-0.5 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs">⚙️</button>
      )}
    </Link>
  )
}
