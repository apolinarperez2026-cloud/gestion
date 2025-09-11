# Configuración de UploadThing

## Pasos para configurar UploadThing:

### 1. Crear cuenta en UploadThing
- Ve a [uploadthing.com](https://uploadthing.com)
- Crea una cuenta o inicia sesión
- Crea una nueva aplicación

### 2. Obtener las credenciales
- En el dashboard de UploadThing, ve a "API Keys"
- Copia tu `Token` (App ID) y `Secret`
- El Token es público y va con `NEXT_PUBLIC_`
- El Secret es privado y solo va en el servidor

### 3. Configurar variables de entorno
Agrega estas variables a tu archivo `.env`:

```env
UPLOADTHING_SECRET="tu-uploadthing-secret-aqui"
UPLOADTHING_TOKEN="tu-uploadthing-token-aqui"
NEXT_PUBLIC_UPLOADTHING_TOKEN="tu-uploadthing-token-aqui"
```

### 4. Configurar el dominio (para producción)
- En el dashboard de UploadThing, ve a "Settings"
- Agrega tu dominio de producción en "Allowed Origins"
- Ejemplo: `https://tu-app.vercel.app`

### 5. Configurar límites (opcional)
- En "Settings" puedes configurar:
  - Tamaño máximo de archivo (por defecto: 5MB)
  - Tipos de archivo permitidos (por defecto: imágenes)
  - Límite de archivos por usuario

## Características implementadas:

- ✅ Subida de imágenes hasta 5MB
- ✅ Validación de tipos de archivo (solo imágenes)
- ✅ Interfaz de usuario integrada
- ✅ Manejo de errores
- ✅ Preview de imágenes
- ✅ Eliminación de imágenes
- ✅ Integración con el formulario de movimientos

## Uso:

1. El usuario hace clic en "Seleccionar Imagen"
2. Se abre el selector de archivos de UploadThing
3. Se sube la imagen automáticamente
4. Se muestra un preview de la imagen
5. La URL se guarda en el formulario
6. Al guardar el movimiento, la URL se almacena en la base de datos

## Ventajas de UploadThing:

- 🚀 **Rápido**: CDN global para entrega rápida
- 🔒 **Seguro**: Validación y sanitización automática
- 💰 **Económico**: Plan gratuito generoso
- 🛠️ **Fácil**: Integración simple con Next.js
- 📱 **Responsive**: Funciona en todos los dispositivos
- 🔄 **Confiable**: 99.9% uptime garantizado
