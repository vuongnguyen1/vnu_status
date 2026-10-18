import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export default function ServiceDetailPage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chartRange, setChartRange] = useState('day')
  const [chartData, setChartData] = useState(null)

  const fetchData = () => {
    fetch(`/api/services/${id}`).then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 15000); return () => clearInterval(i) }, [id])
  useEffect(() => {
    fetch(`/api/services/${id}/chart?range=${chartRange}`).then(r => r.json()).then(setChartData).catch(() => {})
  }, [id, chartRange])

  if (loading) return <div className="flex-grow p-8 text-center text-gray-500">Đang tải...</div>
  if (!data) return <div className="flex-grow p-8 text-center text-red-500">Không tìm thấy dịch vụ</div>

  const svc = data.dto || data.service
  const logs = data.logs || []
  const isOnline = svc.isOnline

  const formatDate = (d) => {
    if (!d) return 'N/A'
    try { return new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return d }
  }

  const lineData = chartData ? {
    labels: chartData.labels,
    datasets: [{
      label: 'Response Time (s)',
      data: chartData.response_times.map(ms => (ms / 1000).toFixed(2)),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      fill: true,
      tension: 0.4,
      borderWidth: 2,
    }]
  } : null

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,0.8)' } },
    scales: {
      x: { ticks: { maxTicksLimit: 12, font: { size: 10 } }, grid: { display: false } },
      y: { title: { display: true, text: 'Response Time (s)', font: { size: 11 } }, grid: { color: 'rgba(128,128,128,0.1)' } }
    },
    elements: { point: { radius: 1, hoverRadius: 4 } }
  }

  return (
    <div className="flex-grow p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm font-semibold">← Quay lại</Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{svc.name}</h1>
              <a href={svc.url} target="_blank" rel="noreferrer" className="text-sm text-gray-500 hover:text-blue-500">{svc.url}</a>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-bold border ${isOnline ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-600 text-white border-red-700 animate-pulse'}`}>
            {isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-xs text-gray-500 mb-1">Response Time</div>
            <div className={`text-xl font-bold ${svc.responseTime < 500 ? 'text-green-600' : svc.responseTime < 2000 ? 'text-yellow-600' : 'text-red-600'}`}>
              {svc.responseTime ? (svc.responseTime / 1000).toFixed(2) + 's' : 'N/A'}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-xs text-gray-500 mb-1">Uptime</div>
            <div className={`text-xl font-bold ${svc.uptime >= 99 ? 'text-green-600' : 'text-yellow-600'}`}>{svc.uptime}%</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-xs text-gray-500 mb-1">HTTP Code</div>
            <div className={`text-xl font-bold ${svc.statusCode >= 200 && svc.statusCode < 300 ? 'text-green-600' : 'text-red-600'}`}>{svc.statusCode || 'N/A'}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-xs text-gray-500 mb-1">SSL Expiry</div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{data.service?.sslExpiry ? formatDate(data.service.sslExpiry) : 'N/A'}</div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white">📈 Response Time</h3>
            <div className="flex space-x-1">
              {['day', 'week', 'month'].map(r => (
                <button key={r} onClick={() => setChartRange(r)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${chartRange === r ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
                  {r === 'day' ? '24h' : r === 'week' ? '7 ngày' : '30 ngày'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: '280px' }}>
            {lineData && <Line data={lineData} options={chartOptions} />}
          </div>
        </div>

        {/* Incident Log */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">📋 Lịch sử sự cố ({logs.length})</h3>
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center py-6">Không có sự cố nào gần đây</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="flex items-start space-x-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${log.statusCode >= 200 && log.statusCode < 300 ? 'bg-green-500' : log.statusCode >= 400 || log.statusCode === 0 ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                  <div className="min-w-0 flex-grow">
                    <div className="text-sm text-gray-700 dark:text-gray-300">{log.message}</div>
                    <div className="flex items-center space-x-3 text-xs text-gray-500 mt-0.5">
                      <span>HTTP {log.statusCode}</span>
                      <span>{log.responseTime ? (log.responseTime / 1000).toFixed(2) + 's' : '-'}</span>
                      <span>{formatDate(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
