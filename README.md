# 📊 Libro Diario de Tiendas

Sistema de gestión financiera para tiendas con múltiples sucursales, desarrollado con Next.js 15, Prisma y PostgreSQL.

## 🚀 Características

- **Gestión de Movimientos**: Registro de ventas, gastos y fondos de caja
- **Múltiples Sucursales**: Soporte para administrar varias sucursales
- **Roles de Usuario**: Administrador, Gerente y Empleado
- **Resumen Financiero**: Reportes mensuales y diarios
- **Configuración**: Gestión de formas de pago y tipos de gasto
- **Autenticación JWT**: Sistema seguro de autenticación

## 🛠️ Tecnologías

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT (JSON Web Tokens)
- **Deployment**: Vercel

## 📋 Prerrequisitos

- Node.js 18+ 
- PostgreSQL (local o en la nube)
- Cuenta de Vercel

## 🚀 Deployment en Vercel

### 1. Preparar la Base de Datos

#### Opción A: PostgreSQL Local
```bash
# Instalar PostgreSQL localmente
# Crear una base de datos
createdb libro_diario_tiendas
```

#### Opción B: PostgreSQL en la Nube (Recomendado)
- **Neon**: https://neon.tech
- **Supabase**: https://supabase.com
- **Railway**: https://railway.app
- **PlanetScale**: https://planetscale.com

### 2. Configurar Variables de Entorno

En Vercel, agregar las siguientes variables de entorno:

```env
# Base de datos (REQUERIDO)
DATABASE_URL="postgresql://usuario:contraseña@host:puerto/nombre_bd?schema=public"

# JWT Secret (REQUERIDO - generar una clave segura)
JWT_SECRET="tu-jwt-secret-super-seguro-aqui"

# URL de la aplicación
NEXTAUTH_URL="https://tu-app.vercel.app"

# Configuración de Prisma
PRISMA_GENERATE_DATAPROXY="true"
```

### 3. Generar JWT Secret

```bash
# Generar una clave segura
openssl rand -base64 32
```

### 4. Deploy en Vercel

#### Opción A: Vercel CLI
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login en Vercel
vercel login

# Deploy
vercel

# Configurar variables de entorno
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add NEXTAUTH_URL
```

#### Opción B: GitHub Integration
1. Conectar repositorio de GitHub con Vercel
2. Configurar variables de entorno en el dashboard de Vercel
3. Deploy automático en cada push

### 5. Configurar Base de Datos en Producción

```bash
# Ejecutar migraciones
vercel env pull .env.local
npx prisma migrate deploy

# Poblar con datos iniciales (opcional)
npx prisma db seed
```

## 🔧 Desarrollo Local

### 1. Clonar el Repositorio
```bash
git clone <tu-repositorio>
cd libro-diario-tiendas
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
```bash
# Copiar archivo de ejemplo
cp env.example .env.local

# Editar .env.local con tus valores
```

### 4. Configurar Base de Datos
```bash
# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# Poblar con datos iniciales
npx prisma db seed
```

### 5. Ejecutar en Desarrollo
```bash
npm run dev
```

## 📊 Estructura de la Base de Datos

### Modelos Principales
- **Usuario**: Gestión de usuarios y roles
- **Sucursal**: Múltiples sucursales
- **Movimiento**: Ventas, gastos y fondos de caja
- **FormaDePago**: Métodos de pago (efectivo, tarjeta, etc.)
- **TipoGasto**: Categorías de gastos

### Roles de Usuario
- **Administrador**: Acceso completo al sistema
- **Gerente**: Gestión de sucursal específica
- **Empleado**: Registro de movimientos diarios

## 🔐 Seguridad

- **JWT Authentication**: Tokens seguros para autenticación
- **Bcrypt**: Hash de contraseñas
- **Validación**: Validación de datos en frontend y backend
- **CORS**: Configuración de CORS para APIs

## 📱 Funcionalidades

### Dashboard Principal
- Resumen financiero
- Acceso rápido a funciones principales
- Gestión de sucursales (solo administradores)

### Gestión de Movimientos
- Registro de ventas con formas de pago
- Registro de gastos por categorías
- Fondo de caja
- Edición y eliminación de movimientos

### Resumen Financiero
- Reportes mensuales
- Desglose por formas de pago
- Totales de ventas y gastos
- Búsqueda y paginación

### Configuración
- Gestión de formas de pago
- Gestión de tipos de gasto
- CRUD completo con validaciones

## 🚨 Solución de Problemas

### Error de Conexión a Base de Datos
```bash
# Verificar conexión
npx prisma db pull

# Regenerar cliente
npx prisma generate
```

### Error de Build en Vercel
```bash
# Verificar variables de entorno
vercel env ls

# Revisar logs de build
vercel logs
```

### Error de Migraciones
```bash
# Resetear base de datos (CUIDADO: elimina datos)
npx prisma migrate reset

# Aplicar migraciones manualmente
npx prisma migrate deploy
```

## 📞 Soporte

Para soporte técnico o reportar bugs, crear un issue en el repositorio.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

---

**¡Listo para producción!   🎉**