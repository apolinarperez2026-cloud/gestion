import Link from 'next/link'

//test
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Libro Diario
          </h1>
          <p className="text-gray-600 mb-8">
            Sistema de gestión para múltiples tiendas
          </p>
        </div>
        
        <div className="space-y-4">
          <Link 
            href="/auth/login" 
            className="w-full btn-primary block text-center"
          >
            Iniciar Sesión
          </Link>
          
          <Link 
            href="/auth/register" 
            className="w-full btn-secondary block text-center"
          >
            Registrarse
          </Link>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          <p>Accede a tu cuenta para gestionar tu tienda</p>
        </div>
      </div>
    </main>
  )
}
