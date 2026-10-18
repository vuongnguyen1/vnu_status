import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function SocPage({ theme, toggleTheme }) {
  const [headerVisible, setHeaderVisible] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'auto' }
  }, [])

  return (
    <div className="fixed inset-0 bg-gray-900 z-30">
      {/* Hover zone */}
      <div className="absolute top-0 left-0 right-0 h-4 z-50" onMouseEnter={() => setHeaderVisible(true)} />
      
      {/* Mini Header - slides in on hover */}
      <div 
        className={`absolute top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}
        onMouseLeave={() => setHeaderVisible(false)}
      >
        <div className="max-w-7xl mx-auto px-4 h-12 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Link to="/"><img src="/logo.png" alt="Logo" className="w-6 h-6 rounded" /></Link>
            <Link to="/" className="text-sm font-bold text-gray-900 dark:text-white">VNU Status</Link>
            <div className="ml-3 pl-3 border-l border-gray-300 flex space-x-3">
              <Link to="/" className="text-xs font-bold text-gray-500 hover:text-blue-600 uppercase">STATUS</Link>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">VNU SOC</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={toggleTheme} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>

      {/* Full screen iframe */}
      <iframe 
        src="https://soc.conphong.io.vn/" 
        title="VNU SOC Dashboard"
        className="w-full h-full border-0"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
    </div>
  )
}
