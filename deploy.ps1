# Script de deployment para Vercel (PowerShell)
Write-Host "🚀 Iniciando deployment a Vercel..." -ForegroundColor Green

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encontró package.json. Asegúrate de estar en el directorio raíz del proyecto." -ForegroundColor Red
    exit 1
}

# Verificar que las variables de entorno estén configuradas
Write-Host "📋 Verificando variables de entorno..." -ForegroundColor Yellow

if (-not $env:DATABASE_URL) {
    Write-Host "⚠️  Advertencia: DATABASE_URL no está configurada" -ForegroundColor Yellow
}

if (-not $env:JWT_SECRET) {
    Write-Host "⚠️  Advertencia: JWT_SECRET no está configurada" -ForegroundColor Yellow
}

# Instalar dependencias
Write-Host "📦 Instalando dependencias..." -ForegroundColor Blue
npm install

# Generar cliente Prisma
Write-Host "🔧 Generando cliente Prisma..." -ForegroundColor Blue
npx prisma generate

# Ejecutar build
Write-Host "🏗️  Ejecutando build..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build exitoso!" -ForegroundColor Green
} else {
    Write-Host "❌ Error en el build" -ForegroundColor Red
    exit 1
}

# Verificar si Vercel CLI está instalado
try {
    vercel --version | Out-Null
} catch {
    Write-Host "📥 Instalando Vercel CLI..." -ForegroundColor Blue
    npm install -g vercel
}

# Deploy a Vercel
Write-Host "🚀 Desplegando a Vercel..." -ForegroundColor Green
vercel --prod

Write-Host "🎉 ¡Deployment completado!" -ForegroundColor Green
Write-Host "📝 Recuerda configurar las variables de entorno en Vercel:" -ForegroundColor Yellow
Write-Host "   - DATABASE_URL" -ForegroundColor White
Write-Host "   - JWT_SECRET" -ForegroundColor White
Write-Host "   - NEXTAUTH_URL" -ForegroundColor White
