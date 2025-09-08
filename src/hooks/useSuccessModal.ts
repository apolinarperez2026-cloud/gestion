import { useState } from 'react'

interface SuccessModalState {
  isOpen: boolean
  title: string
  message: string
  buttonText: string
  onClose: () => void
}

export function useSuccessModal() {
  const [modalState, setModalState] = useState<SuccessModalState>({
    isOpen: false,
    title: '',
    message: '',
    buttonText: 'Aceptar',
    onClose: () => {}
  })

  const showSuccess = (config: Partial<SuccessModalState>) => {
    setModalState({
      isOpen: true,
      title: config.title || '',
      message: config.message || '',
      buttonText: config.buttonText || 'Aceptar',
      onClose: config.onClose || (() => {})
    })
  }

  const hideSuccess = () => {
    setModalState(prev => ({ ...prev, isOpen: false }))
  }

  const handleClose = () => {
    modalState.onClose()
    hideSuccess()
  }

  return {
    modalState,
    showSuccess,
    hideSuccess,
    handleClose
  }
}
