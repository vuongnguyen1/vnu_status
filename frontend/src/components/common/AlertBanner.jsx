import React from 'react'

export default function AlertBanner({ offlineServices }) {
  if (!offlineServices || offlineServices.length === 0) return null

  return (
    <div className="alert-banner">
      <div className="alert-pulse"></div>
      <span className="alert-icon">🚨</span>
      <span className="alert-text">
        <strong>{offlineServices.length} dịch vụ đang sự cố:</strong>{' '}
        {offlineServices.map(s => s.name).join(', ')}
      </span>
    </div>
  )
}
