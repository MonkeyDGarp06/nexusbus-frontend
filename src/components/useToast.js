import { useState, useCallback } from 'react'

let nextId = 1

export function useToast() {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'success', onUndo = null) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type, onUndo }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, onUndo ? 5000 : 3500)
  }, [])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, toast, remove }
}
