import React, { useState, useEffect } from 'react'

export default function ServiceEditModal({ service, token, onClose, onSave }) {
  const [formData, setFormData] = useState({
    useXpath: false, xpath: '',
    useSelector: false, selector: '',
    useKeyword: false, keyword: '',
    useLoginVerify: false, loginVerifyString: '',
    ignoreSsl: true,
    timeout: 15,
    failureThreshold: 2,
    checkInterval: 60
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (service) {
      // Fetch full service data with admin token
      fetch(`/api/services/${service.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          const s = data.service || service
          setFormData({
            useXpath: s.useXpath || false,
            xpath: s.xpath || '',
            useSelector: s.useSelector || false,
            selector: s.selector || '',
            useKeyword: s.useKeyword || false,
            keyword: s.keyword || '',
            useLoginVerify: s.useLoginVerify || false,
            loginVerifyString: s.loginVerifyString || '',
            ignoreSsl: s.ignoreSsl !== undefined ? s.ignoreSsl : true,
            timeout: s.timeout !== undefined ? s.timeout : 15,
            failureThreshold: s.failureThreshold !== undefined ? s.failureThreshold : 2,
            checkInterval: s.checkInterval !== undefined ? s.checkInterval : 60
          })
        })
        .catch(() => {})
    }
  }, [service, token])

  if (!service) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess(false)

    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => onSave(), 800)
      } else {
        setError('Lỗi cập nhật. Kiểm tra quyền Admin.')
      }
    } catch { setError('Lỗi kết nối máy chủ') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-base md:text-lg">
              <span>⚙️</span> Cấu hình Smart Check
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-[320px] md:max-w-md truncate">{service.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">×</button>
        </div>

        {/* Form Body - scrollable */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-grow">
          {error && <div className="p-2.5 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">{error}</div>}
          {success && <div className="p-2.5 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded text-sm text-green-700 dark:text-green-400">✅ Lưu thành công!</div>}

          {/* Basic Config */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Timeout (Giây)</label>
              <input type="number" min="1" max="60" value={formData.timeout} onChange={e => setFormData({...formData, timeout: parseInt(e.target.value) || 15})}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
              <p className="text-[9px] text-gray-500 mt-1">Hết hạn kết nối (tối đa 60s)</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Ngưỡng lỗi (Thử lại)</label>
              <input type="number" min="1" max="10" value={formData.failureThreshold} onChange={e => setFormData({...formData, failureThreshold: parseInt(e.target.value) || 2})}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
              <p className="text-[9px] text-gray-500 mt-1">Lỗi liên tiếp trước khi báo OFFLINE</p>
            </div>
            <div className="col-span-2 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
              <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">Tần suất kiểm tra (Giây)</label>
              <input type="number" min="30" max="86400" value={formData.checkInterval} onChange={e => setFormData({...formData, checkInterval: parseInt(e.target.value) || 60})}
                className="w-full px-3 py-1.5 text-sm border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
              <p className="text-[9px] text-blue-600 dark:text-blue-400 mt-1">Chu kỳ lặp lại kiểm tra. Mặc định 60s. Tăng lên (vd: 300s) với trang dễ spam</p>
            </div>
          </div>

          {/* SSL Check */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-800">
            <label className="flex items-center cursor-pointer">
              <input type="checkbox" checked={formData.ignoreSsl} onChange={e => setFormData({...formData, ignoreSsl: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 mr-3" />
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Bỏ qua lỗi SSL</span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Không đánh dấu sập khi chứng chỉ SSL hết hạn, lỗi tên miền hoặc tự ký</p>
              </div>
            </label>
          </div>

          {/* Keyword Check */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-800 space-y-2">
            <label className="flex items-center cursor-pointer">
              <input type="checkbox" checked={formData.useKeyword} onChange={e => setFormData({...formData, useKeyword: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 mr-3" />
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Kiểm tra từ khóa (Keyword)</span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Yêu cầu trang chứa cụm từ khóa này để xem là hoạt động bình thường</p>
              </div>
            </label>
            {formData.useKeyword && (
              <input type="text" value={formData.keyword} onChange={e => setFormData({...formData, keyword: e.target.value})}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Ví dụ: Đăng nhập, VNU, Bản quyền..." />
            )}
          </div>

          {/* CSS Selector Check */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-800 space-y-2">
            <label className="flex items-center cursor-pointer">
              <input type="checkbox" checked={formData.useSelector} onChange={e => setFormData({...formData, useSelector: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 mr-3" />
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">CSS Selector (HTML Element)</span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Xác minh bằng sự tồn tại của thẻ CSS trong mã nguồn</p>
              </div>
            </label>
            {formData.useSelector && (
              <input type="text" value={formData.selector} onChange={e => setFormData({...formData, selector: e.target.value})}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Ví dụ: #login-form, .main-container, div.content" />
            )}
          </div>

          {/* XPath Check */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-800 space-y-2">
            <label className="flex items-center cursor-pointer">
              <input type="checkbox" checked={formData.useXpath} onChange={e => setFormData({...formData, useXpath: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 mr-3" />
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">XPath / Text cụ thể</span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Dùng XPath hoặc chuỗi ký tự cố định để tăng độ tin cậy tuyệt đối</p>
              </div>
            </label>
            {formData.useXpath && (
              <input type="text" value={formData.xpath} onChange={e => setFormData({...formData, xpath: e.target.value})}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Ví dụ: //div[@class='login-box'] hoặc 'Cổng thông tin'" />
            )}
          </div>

          {/* Login Verify string */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-800 space-y-2">
            <label className="flex items-center cursor-pointer">
              <input type="checkbox" checked={formData.useLoginVerify} onChange={e => setFormData({...formData, useLoginVerify: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 mr-3" />
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Đăng nhập xác minh (Login Verify String)</span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Xác minh đăng nhập hoặc chuỗi bảo mật nâng cao</p>
              </div>
            </label>
            {formData.useLoginVerify && (
              <input type="text" value={formData.loginVerifyString} onChange={e => setFormData({...formData, loginVerifyString: e.target.value})}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Nhập chuỗi login verify..." />
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
            Hủy
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors flex items-center gap-1.5">
            {saving ? 'Đang lưu...' : '💾 Lưu cấu hình'}
          </button>
        </div>
      </div>
    </div>
  )
}
