import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// DELETE - Eliminar un depósito bancario por ID
export async function DELETE(
  request: NextRequest,
  context: any
) {
  try {
    // Validar el header de autorización
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    // Se puede agregar validación extra aquí según los roles, si lo deseas

    let idValue;
    if (typeof context.params?.then === 'function') {
      // Si params es una promesa, hay que await
      const awaited = await context.params;
      idValue = awaited.id;
    } else {
      idValue = context.params.id;
    }
    const idNum = parseInt(idValue, 10);
    if (isNaN(idNum)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verificar si el depósito existe
    const deposito = await prisma.deposito.findUnique({ where: { id: idNum } });
    if (!deposito) {
      return NextResponse.json({ error: 'Depósito no encontrado' }, { status: 404 });
    }
    // Eliminar el depósito
    await prisma.deposito.delete({ where: { id: idNum } });
    return NextResponse.json({ message: 'Depósito eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar depósito:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}


