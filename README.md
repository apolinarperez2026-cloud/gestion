# Libro Diario - Sistema de Gestión de Tiendas

Sistema de gestión de libro diario para múltiples tiendas desarrollado con Next.js 15, Prisma y PostgreSQL.

## Características

- 🔐 Sistema de autenticación con JWT
- 👥 Gestión de usuarios con roles (Administrador, Gerente, Empleado)
- 🏪 Gestión de múltiples sucursales
- 📊 Registro de movimientos contables
- 💰 Control de fondo de caja
- 📦 Gestión de pedidos especiales
- 🎨 Interfaz moderna con Tailwind CSS

## Tecnologías

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Base de datos**: PostgreSQL con Prisma ORM
- **Autenticación**: JWT con cookies httpOnly
- **Validación**: Zod

## Instalación

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd libro-diario-tiendas
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo `env.example` a `.env.local` y configura las variables:

```bash
cp env.example .env.local
```

Edita `.env.local` con tus valores:

```env
# Base de datos
DATABASE_URL="postgresql://usuario:contraseña@host:puerto/nombre_bd?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-key-aqui"

# JWT
JWT_SECRET="tu-jwt-secret-aqui"
```

### 4. Configurar la base de datos

```bash
# Generar el cliente de Prisma
npm run db:generate

# Aplicar las migraciones a la base de datos
npm run db:push
```

### 5. Ejecutar la aplicación

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## Estructura del Proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── api/               # API Routes
│   │   └── auth/          # Endpoints de autenticación
│   ├── auth/              # Páginas de autenticación
│   ├── dashboard/         # Panel principal
│   └── globals.css        # Estilos globales
├── components/            # Componentes reutilizables
├── lib/                   # Utilidades y configuración
│   └── prisma.ts         # Cliente de Prisma
└── types/                 # Definiciones de TypeScript
    └── database.ts       # Tipos de la base de datos
```

## Modelos de Base de Datos

### Usuarios y Roles
- **Usuario**: Información personal y credenciales
- **Rol**: Administrador, Gerente, Empleado
- **Sucursal**: Ubicaciones físicas de las tiendas

### Contabilidad
- **Movimiento**: Registro de ingresos y gastos
- **TipoGasto**: Categorización de gastos
- **FondoCaja**: Control diario de efectivo

### Inventario
- **PedidoEspecial**: Gestión de pedidos especiales

## Roles y Permisos

### Administrador
- Acceso a todas las sucursales
- Gestión de usuarios
- Gestión de sucursales
- Reportes globales

### Gerente de Tienda
- Acceso solo a su sucursal
- Gestión de empleados de su sucursal
- Reportes de su sucursal

### Empleado
- Acceso limitado a funciones básicas
- Registro de movimientos
- Consulta de información

## Comandos Útiles

```bash
# Desarrollo
npm run dev

# Construcción
npm run build

# Producción
npm start

# Base de datos
npm run db:generate    # Generar cliente Prisma
npm run db:push        # Aplicar cambios al esquema
npm run db:migrate     # Crear migración
npm run db:studio      # Abrir Prisma Studio
```

## Próximas Funcionalidades

- [ ] Dashboard con gráficos y estadísticas
- [ ] Reportes en PDF
- [ ] Notificaciones en tiempo real
- [ ] API REST completa
- [ ] Tests unitarios y de integración
- [ ] Dockerización
- [ ] Despliegue en la nube

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.
