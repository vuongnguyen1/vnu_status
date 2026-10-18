import { useState, useEffect, useRef, useCallback } from 'react'

export function useSSE(url) {
  const [data, setData] = useState(null)
  const esRef = useRef(null)
  const reconnectRef = useRef(null)

  useEffect(() => {
    function connect() {
      if (esRef.current) esRef.current.close()
      const es = new EventSource(url)
      esRef.current = es

      es.addEventListener('status-update', (e) => {
        try {
          setData({ type: 'single', payload: JSON.parse(e.data), ts: Date.now() })
        } catch {}
      })

      es.addEventListener('bulk-update', (e) => {
        try {
          setData({ type: 'bulk', payload: JSON.parse(e.data), ts: Date.now() })
        } catch {}
      })

      es.onerror = () => {
        es.close()
        // Reconnect after 5s
        reconnectRef.current = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      if (esRef.current) esRef.current.close()
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
    }
  }, [url])

  return data
}

export function useApi(url, options = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const headersRef = useRef(options.headers || {})

  // Update headers when they change
  useEffect(() => {
    headersRef.current = options.headers || {}
  }, [options.headers])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url, { headers: headersRef.current })
      if (!res.ok) throw new Error('API error: ' + res.status)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
