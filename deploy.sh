#!/bin/bash

# Script de deployment para Vercel
echo "🚀 Iniciando deployment a Vercel..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json. Asegúrate de estar en el directorio raíz del proyecto."
    exit 1
fi

# Verificar que las variables de entorno estén configuradas
echo "📋 Verificando variables de entorno..."

if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  Advertencia: DATABASE_URL no está configurada"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  Advertencia: JWT_SECRET no está configurada"
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Generar cliente Prisma
echo "🔧 Generando cliente Prisma..."
npx prisma generate

# Ejecutar build
echo "🏗️  Ejecutando build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build exitoso!"
else
    echo "❌ Error en el build"
    exit 1
fi

# Verificar si Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "📥 Instalando Vercel CLI..."
    npm install -g vercel
fi

# Deploy a Vercel
echo "🚀 Desplegando a Vercel..."
vercel --prod

echo "🎉 ¡Deployment completado!"
echo "📝 Recuerda configurar las variables de entorno en Vercel:"
echo "   - DATABASE_URL"
echo "   - JWT_SECRET"
echo "   - NEXTAUTH_URL"
