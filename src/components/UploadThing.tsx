'use client'

import { useState, useRef } from 'react'
import { useUploadThing } from '@/lib/uploadthing-provider'

interface UploadThingProps {
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: Error) => void;
  disabled?: boolean;
}

export default function UploadThingComponent({ 
  onUploadComplete, 
  onUploadError, 
  disabled = false 
}: UploadThingProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { startUpload } = useUploadThing('imageUploader')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      onUploadError?.(new Error('Solo se permiten archivos de imagen'))
      return
    }

    // Validar tamaño (4MB - límite de UploadThing)
    if (file.size > 4 * 1024 * 1024) {
      onUploadError?.(new Error('El archivo es demasiado grande. Máximo 4MB'))
      return
    }

    setUploading(true)

    try {
      const res = await startUpload([file])
      
      if (res && res[0]?.url) {
        onUploadComplete?.(res[0].url)
      } else {
        throw new Error('No se recibió la URL de la imagen')
      }
    } catch (error) {
      onUploadError?.(error as Error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200"
      >
        {uploading ? 'Subiendo...' : 'Seleccionar Imagen'}
      </button>
      <p className="text-xs text-gray-500 mt-1">Imagen (máx. 4MB)</p>
    </div>
  )
}
