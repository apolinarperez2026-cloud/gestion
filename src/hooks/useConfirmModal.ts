import { useState } from 'react'

interface ModalState {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  type: 'warning' | 'success' | 'error'
  onConfirm: () => void
}

export function useConfirmModal() {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    type: 'warning',
    onConfirm: () => {}
  })

  const showConfirm = (config: Partial<ModalState>) => {
    setModalState({
      isOpen: true,
      title: config.title || '',
      message: config.message || '',
      confirmText: config.confirmText || 'Aceptar',
      cancelText: config.cancelText || 'Cancelar',
      type: config.type || 'warning',
      onConfirm: config.onConfirm || (() => {})
    })
  }

  const hideConfirm = () => {
    setModalState(prev => ({ ...prev, isOpen: false }))
  }

  const handleConfirm = () => {
    modalState.onConfirm()
    hideConfirm()
  }

  return {
    modalState,
    showConfirm,
    hideConfirm,
    handleConfirm
  }
}