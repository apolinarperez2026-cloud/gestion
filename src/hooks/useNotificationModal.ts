import { useState } from 'react'

interface NotificationModalState {
  isOpen: boolean
  title: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

export function useNotificationModal() {
  const [modalState, setModalState] = useState<NotificationModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  })

  const showNotification = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setModalState({
      isOpen: true,
      title,
      message,
      type
    })
  }

  const hideNotification = () => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }))
  }

  return {
    modalState,
    showNotification,
    hideNotification
  }
}
