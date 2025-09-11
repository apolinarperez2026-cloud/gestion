import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    console.log('Iniciando subida de archivo...')
    
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    console.log('Archivo recibido:', file ? { name: file.name, size: file.size, type: file.type } : 'null')

    if (!file) {
      console.log('Error: No se encontró archivo')
      return NextResponse.json({ error: 'No se encontró archivo' }, { status: 400 })
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      console.log('Error: Tipo de archivo no permitido:', file.type)
      return NextResponse.json({ 
        error: 'Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP)' 
      }, { status: 400 })
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      console.log('Error: Archivo demasiado grande:', file.size)
      return NextResponse.json({ 
        error: 'El archivo es demasiado grande. Máximo 5MB' 
      }, { status: 400 })
    }

    console.log('Validaciones pasadas, procesando archivo...')

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generar nombre único para el archivo
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `${timestamp}_${randomString}.${extension}`

    // Ruta donde se guardará el archivo
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    const filePath = join(uploadDir, fileName)

    console.log('Ruta de destino:', filePath)

    // Crear directorio si no existe
    if (!existsSync(uploadDir)) {
      console.log('Creando directorio:', uploadDir)
      await mkdir(uploadDir, { recursive: true })
    }

    // Escribir archivo
    console.log('Escribiendo archivo...')
    await writeFile(filePath, buffer)

    // Retornar la URL del archivo
    const fileUrl = `/uploads/${fileName}`
    console.log('Archivo subido exitosamente:', fileUrl)

    return NextResponse.json({ 
      success: true,
      fileName,
      fileUrl,
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('Error al subir archivo:', error)
    return NextResponse.json(
      { error: `Error interno del servidor: ${error instanceof Error ? error.message : 'Error desconocido'}` },
      { status: 500 }
    )
  }
}
