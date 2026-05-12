# TODO_bugs — Sincronización de MovimientoDiario
> Diagnóstico: 2026-05-12 | Proyecto: `gestion`
> Este archivo trackea los bugs de sincronización entre tablas fuente y `MovimientoDiario`.

---

## Contexto y causa raíz

`MovimientoDiario` tiene **4 campos que se calculan automáticamente** desde otras tablas:

| Campo | Tabla fuente | Operaciones que lo afectan |
|-------|-------------|---------------------------|
| `gastos` | `Movimiento` (tipo = GASTO) | POST, PUT, DELETE |
| `pagoTarjeta` | `Tpv` (estado = exitoso) | POST, PUT, DELETE |
| `depositos` | `Deposito` | POST, PATCH, DELETE |
| `fondoInicial` | `FondoCajaInicial` | POST, PUT, DELETE |

**El problema:** cuando una de esas tablas cambia (se crea, edita o borra un registro), `MovimientoDiario` NO se actualiza automáticamente. El campo queda desactualizado hasta que el usuario edita el registro diario de forma manual.

Esto afecta a **todas las sucursales** actuales y futuras porque el bug está en las rutas API, no en los datos.

**La solución correcta (SOLID):** crear una única función centralizada `recalcularMovimientoDiario(fecha, sucursalId, prisma)` en `src/lib/` que recalcule los 4 campos de una sola vez. Cada ruta la llama con una línea. Hay un solo lugar para mantener.

---

## Estado de cada operación antes del fix

| Ruta | Método | Campo afectado | Recalcula hoy |
|------|--------|---------------|---------------|
| `POST /api/movimientos` | Crear gasto | `gastos` | ✅ BUG-08b |
| `PUT /api/movimientos/[id]` | Editar gasto | `gastos` | ✅ BUG-08c |
| `DELETE /api/movimientos/[id]` | Borrar gasto | `gastos` | ✅ BUG-08d |
| `POST /api/tpv` | Crear cobro TPV | `pagoTarjeta` | ✅ BUG-08e |
| `PUT /api/tpv/[id]` | Editar cobro TPV | `pagoTarjeta` | ✅ BUG-08f |
| `DELETE /api/tpv/[id]` | Borrar cobro TPV | `pagoTarjeta` | ✅ BUG-08f |
| `POST /api/depositos` | Crear depósito | `depositos` | ✅ BUG-08g |
| `PATCH /api/depositos/[id]` | Editar depósito | `depositos` | ✅ BUG-08h |
| `DELETE /api/depositos/[id]` | Borrar depósito | `depositos` | ✅ BUG-08i |
| `POST /api/fondo-caja-inicial` | Crear fondo inicial | `fondoInicial` | ✅ BUG-08j |
| `PUT /api/fondo-caja-inicial/[id]` | Editar fondo inicial | `fondoInicial` | ✅ BUG-08k |
| `DELETE /api/fondo-caja-inicial/[id]` | Borrar fondo inicial | `fondoInicial` | ✅ BUG-08l |

**12/12 operaciones sincronizadas. ✅ — Completado 2026-05-12**

---

## Checklist de tareas

| # | Tarea | Tipo | Prioridad | Estado | Responsable |
|---|-------|------|-----------|--------|-------------|
| BUG-08a | Crear helper centralizado `recalcularMovimientoDiario.ts` | Nuevo archivo | 🔴 Crítico | ✅ Completado 2026-05-12 | Alber/Claude |
| BUG-08b | Conectar helper en `POST /api/movimientos` | API | 🔴 Crítico | ✅ Completado 2026-05-12 | Alber/Claude |
| BUG-08c | Conectar helper en `PUT /api/movimientos/[id]` | API | 🔴 Crítico | ✅ Completado 2026-05-12 | Alber/Claude |
| BUG-08d | Conectar helper en `DELETE /api/movimientos/[id]` | API | 🔴 Crítico | ✅ Completado 2026-05-12 | Alber/Claude |
| BUG-08e | Conectar helper en `POST /api/tpv` | API | 🔴 Crítico | ✅ Completado 2026-05-12 | Alber/Claude |
| BUG-08f | Refactorizar `PUT/DELETE /api/tpv/[id]` para usar el helper (reemplaza fix inline de BUG-06) | API | 🟡 Limpieza | ✅ Completado 2026-05-12 | Alber/Claude |
| BUG-08g | Conectar helper en `POST /api/depositos` | API | 🔴 Crítico | ✅ Completado 2026-05-12 | Alber/Claude |
| BUG-08h | Conectar helper en `PATCH /api/depositos/[id]` | API | 🔴 Crítico | ✅ Completado 2026-05-12 | Alber/Claude |
| BUG-08i | Conectar helper en `DELETE /api/depositos/[id]` | API | 🔴 Crítico | ✅ Completado 2026-05-12 | Alber/Claude |
| BUG-08j | Conectar helper en `POST /api/fondo-caja-inicial` | API | 🔴 Crítico | ✅ Completado 2026-05-12 | Alber/Claude |
| BUG-08k | Conectar helper en `PUT /api/fondo-caja-inicial/[id]` | API | 🔴 Crítico | ✅ Completado 2026-05-12 | Alber/Claude |
| BUG-08l | Conectar helper en `DELETE /api/fondo-caja-inicial/[id]` | API | 🔴 Crítico | ✅ Completado 2026-05-12 | Alber/Claude |

**Dependencias:** BUG-08a debe completarse primero. El resto (b–l) son independientes entre sí y pueden hacerse en cualquier orden una vez que el helper existe.

**Leyenda:** ⬜ Pendiente · 🔄 En progreso · ✅ Completado · ❌ Bloqueado

---

## Detalle de cada tarea

---

### BUG-08a — Crear helper centralizado `recalcularMovimientoDiario.ts`

**Archivo a crear:** `src/lib/recalcularMovimientoDiario.ts`

**Qué hace:**
1. Recibe `fecha: Date` y `sucursalId: number`
2. Consulta los 4 campos derivados para ese día y sucursal:
   - `gastos` → suma de `Movimiento` donde `tipo = 'GASTO'`
   - `pagoTarjeta` → suma de `Tpv` donde `estado = 'exitoso'`
   - `depositos` → suma de `Deposito`
   - `fondoInicial` → valor de `FondoCajaInicial` del día (o 0 si no existe)
3. Actualiza `MovimientoDiario` con esos 4 valores usando `updateMany`
4. Si no existe `MovimientoDiario` para esa fecha+sucursal, no hace nada (no crea uno vacío)

**Firma esperada:**
```typescript
export async function recalcularMovimientoDiario(
  fecha: Date,
  sucursalId: number,
  prisma: PrismaClient
): Promise<void>
```

**Usa:** `createDateRange(fechaStr)` de `src/lib/dateUtils.ts` para el rango del día (patrón ya establecido en BUG-06)

**Test:**
```
[ ] Crear un gasto nuevo → MovimientoDiario.gastos aumenta el monto correcto
[ ] Editar ese gasto a otro monto → MovimientoDiario.gastos refleja el nuevo monto
[ ] Borrar ese gasto → MovimientoDiario.gastos vuelve al valor anterior
[ ] Crear un depósito → MovimientoDiario.depositos se actualiza
[ ] Borrar ese depósito → MovimientoDiario.depositos vuelve al valor anterior
[ ] Crear cobro TPV → MovimientoDiario.pagoTarjeta se actualiza
[ ] Crear fondo inicial → MovimientoDiario.fondoInicial se actualiza
[ ] Si no existe MovimientoDiario para esa fecha → no se crea ningún registro nuevo (no rompe)
```

---

### BUG-08b — Conectar en `POST /api/movimientos`

**Archivo:** `src/app/api/movimientos/route.ts`

**Cuándo:** solo si `tipo === 'GASTO'` (las ventas no afectan campos derivados de MovimientoDiario)

**Dónde:** después del `prisma.movimiento.create(...)`, antes del `return`

**Test:**
```
[ ] Registrar un gasto de $500 en FK01 para el día 15/01
[ ] Verificar que MovimientoDiario del 15/01 FK01 tiene gastos += $500
[ ] Registrar una VENTA → MovimientoDiario.gastos NO cambia (ventas no deben tocarlo)
```

---

### BUG-08c — Conectar en `PUT /api/movimientos/[id]`

**Archivo:** `src/app/api/movimientos/[id]/route.ts`

**Cuándo:** si el movimiento era GASTO o si el tipo cambió a/desde GASTO

**Consideración:** si se cambió la fecha del movimiento, recalcular ambas fechas (la anterior y la nueva), igual que en `tpv/[id]`

**Test:**
```
[ ] Editar un gasto de $500 a $800 → MovimientoDiario.gastos aumenta $300
[ ] Editar la fecha del gasto al día siguiente → ambos días recalculados correctamente
```

---

### BUG-08d — Conectar en `DELETE /api/movimientos/[id]`

**Archivo:** `src/app/api/movimientos/[id]/route.ts`

**Cuándo:** solo si el movimiento borrado era GASTO

**Dónde:** obtener `fecha` y `sucursalId` del registro antes de borrar, luego borrar, luego recalcular

**Test:**
```
[ ] Borrar un gasto de $500 → MovimientoDiario.gastos disminuye $500
[ ] Borrar una VENTA → MovimientoDiario.gastos NO cambia
```

---

### BUG-08e — Conectar en `POST /api/tpv`

**Archivo:** `src/app/api/tpv/route.ts`

**Nota:** el PUT y DELETE ya fueron fixeados en BUG-06 pero el POST fue omitido

**Cuándo:** solo si `estado === 'exitoso'`

**Test:**
```
[ ] Crear un cobro TPV exitoso de $300 → MovimientoDiario.pagoTarjeta += $300
[ ] Crear un cobro TPV en_proceso de $300 → MovimientoDiario.pagoTarjeta NO cambia
```

---

### BUG-08f — Refactorizar `PUT/DELETE /api/tpv/[id]` para usar el helper

**Archivo:** `src/app/api/tpv/[id]/route.ts`

**Qué hacer:** reemplazar la función `recalcularPagoTarjetaDia` inline definida en ese archivo por una llamada al nuevo helper centralizado `recalcularMovimientoDiario`. El comportamiento es idéntico, solo se consolida el código.

**Test:**
```
[ ] Editar cobro TPV → MovimientoDiario.pagoTarjeta se actualiza (mismo comportamiento que antes)
[ ] Borrar cobro TPV → MovimientoDiario.pagoTarjeta se actualiza (mismo comportamiento que antes)
```

---

### BUG-08g — Conectar en `POST /api/depositos`

**Archivo:** `src/app/api/depositos/route.ts`

**Nota:** este archivo también tiene un `upsert` de `MovimientoDiario` pero no recalcula desde la tabla `Deposito` — lo reemplaza el helper

**Test:**
```
[ ] Crear un depósito de $2,000 → MovimientoDiario.depositos += $2,000
```

---

### BUG-08h — Conectar en `PATCH /api/depositos/[id]`

**Archivo:** `src/app/api/depositos/[id]/route.ts`

**Consideración:** si se cambió la fecha del depósito, recalcular ambas fechas

**Test:**
```
[ ] Editar un depósito de $2,000 a $3,000 → MovimientoDiario.depositos refleja el nuevo total
[ ] Editar la fecha del depósito → ambos días recalculados
```

---

### BUG-08i — Conectar en `DELETE /api/depositos/[id]`

**Archivo:** `src/app/api/depositos/[id]/route.ts`

**Test:**
```
[ ] Borrar un depósito de $2,000 → MovimientoDiario.depositos disminuye $2,000
```

---

### BUG-08j — Conectar en `POST /api/fondo-caja-inicial`

**Archivo:** `src/app/api/fondo-caja-inicial/route.ts`

**Test:**
```
[ ] Crear fondo inicial de $500 → MovimientoDiario.fondoInicial = $500
```

---

### BUG-08k — Conectar en `PUT /api/fondo-caja-inicial/[id]`

**Archivo:** `src/app/api/fondo-caja-inicial/[id]/route.ts`

**Test:**
```
[ ] Editar fondo inicial de $500 a $800 → MovimientoDiario.fondoInicial = $800
```

---

### BUG-08l — Conectar en `DELETE /api/fondo-caja-inicial/[id]`

**Archivo:** `src/app/api/fondo-caja-inicial/[id]/route.ts`

**Test:**
```
[ ] Borrar fondo inicial → MovimientoDiario.fondoInicial = 0
```

---

## Orden de implementación recomendado

```
1. BUG-08a  ← helper (bloquea todo lo demás)
2. BUG-08b, 08c, 08d  ← gastos (mayor impacto, directamente visible en resumen)
3. BUG-08e, 08f  ← TPV (completa BUG-06 + limpieza)
4. BUG-08g, 08h, 08i  ← depósitos
5. BUG-08j, 08k, 08l  ← fondo inicial
```

---

---

## BUG-09 — Resumen: días futuros aparecen con saldo acumulado arrastrado

**Detectado:** 2026-05-12 | **Estado:** ✅ Completado 2026-05-12

**Síntoma:** en el mes actual, la tabla mostraba días futuros (ej: 13/05 a 31/05 cuando hoy es 12/05) todos con $0 en ventas/gastos pero con el saldo acumulado del último día real (ej: -$1,631.4). Visualmente parecía un error de datos.

**Root cause:** el fix de BUG-05 generaba `Array.from({ length: diasEnMes })` sin distinción entre mes actual y meses pasados. Para mayo con 31 días, generaba los 31 aunque solo existieran 12.

**Fix aplicado (`resumen/page.tsx`):**
```typescript
const _esMesActual = _añoNum === _hoy.getFullYear() && _mesNum === (_hoy.getMonth() + 1)
const _diasAMostrar = _esMesActual ? Math.min(_hoy.getDate(), _diasEnMes) : _diasEnMes
```

- Mes actual → genera solo hasta hoy
- Meses pasados → genera todos los días (BUG-05 intacto)

**Test:**
```
[x] Mayo (mes actual, hoy = 12/05) → tabla muestra días 1 al 12 únicamente  ✅
[x] Abril (mes pasado) → tabla sigue mostrando los 30 días  ✅
[x] Días sin registro en mes actual → aparecen con $0 pero sin saldo arrastrado de días vacíos  ✅
```

---

*Documento actualizado: 2026-05-12*
