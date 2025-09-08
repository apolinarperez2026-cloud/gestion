'use client'

import { useState } from 'react'

interface ConfirmModalState {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  onConfirm?: () => void
}

export function useConfirmModal() {
  const [modalState, setModalState] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'danger'
  })

  const showConfirm = (options: Omit<ConfirmModalState, 'isOpen'>) => {
    setModalState({
      ...options,
      isOpen: true
    })
  }

  const hideConfirm = () => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }))
  }

  const handleConfirm = () => {
    if (modalState.onConfirm) {
      modalState.onConfirm()
    }
    hideConfirm()
  }

  return {
    modalState,
    showConfirm,
    hideConfirm,
    handleConfirm
  }
}
