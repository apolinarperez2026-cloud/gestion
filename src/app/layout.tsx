import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { UploadThingProvider } from '@/lib/uploadthing-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Libro Diario - Sistema de Gestión de Tiendas',
  description: 'Sistema de gestión de libro diario para múltiples tiendas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <UploadThingProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </UploadThingProvider>
      </body>
    </html>
  )
}
