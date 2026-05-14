# TODO_bugs — Proyecto `gestion`
> Última actualización: 2026-05-14
> TypeScript: 0 errores ✅ · 14 bugs resueltos ✅

---

## ✅ Checklist completa — todos los bugs del proyecto

| # | Bug | Archivo(s) | Impacto | Estado |
|---|-----|-----------|---------|--------|
| BUG-05 | Resumen — tabla mostraba solo días con registros, faltaban días sin movimiento | `resumen/page.tsx` | 🔴 Alto | ✅ 2026-05-12 |
| BUG-06 | TPV — `pagoTarjeta` del MovimientoDiario no se recalculaba al editar/borrar un cobro | `api/tpv/[id]/route.ts` | 🔴 Alto | ✅ 2026-05-12 |
| BUG-07 | Control — totales del mes no cambiaban al seleccionar otro mes desde el selector | `resumen/page.tsx` | 🔴 Alto | ✅ 2026-05-12 |
| BUG-08 | Sincronización MovimientoDiario — 12 operaciones sin recálculo de campos derivados | múltiples `api/` routes | 🔴 Crítico | ✅ 2026-05-12 |
| BUG-09 | Días futuros del mes actual aparecían con saldo acumulado arrastrado | `resumen/page.tsx` | 🔴 Alto | ✅ 2026-05-12 |
| BUG-10 | Fechas UTC desfasadas — último día del mes siempre aparecía en cero | `resumen/page.tsx` | 🔴 Alto | ✅ 2026-05-13 |
| BUG-11 | AbonosCredito no sumaba al Saldo del Día — 3 fórmulas incorrectas | `resumen/page.tsx` | 🔴 Alto | ✅ 2026-05-13 |
| BUG-12 | Contador "gastos totales" incluía ventas en el conteo | `movimientos-individuales/page.tsx` | 🟡 Medio | ✅ 2026-05-13 |
| BUG-13 | Fondo de Caja Inicial mostraba suma acumulada en vez del último valor del mes | `fondo-caja-inicial/page.tsx` | 🟡 Medio | ✅ 2026-05-13 |
| BUG-14 | Imágenes de comprobantes sin zoom en tablas de TPV y Depósitos | `tpv/page.tsx` | 🔵 UI | ✅ 2026-05-13 |
| BUG-15 | Excel exportado: fechas -1 día y saldo acumulado incorrecto | `resumen/page.tsx` | 🔴 Alto | ✅ 2026-05-13 |
| BUG-16 | Selectores de Mes/Año — texto blanco invisible sobre fondo blanco (modo dark) | `globals.css` + todos los dashboards | 🔵 UI | ✅ 2026-05-13 |
| BUG-17 | Etiqueta "Totales del Mes" incorrecta — debía decir "Promedio del Mes" | `resumen`, `movimientos`, `depositos` | 🔵 UI | ✅ 2026-05-13 |
| BUG-18 | Admin veía todas las sucursales combinadas — Excel exportaba datos mezclados | `resumen/page.tsx` + `api/movimientos-diarios/route.ts` | 🔴 Alto | ✅ 2026-05-14 |

**14/14 bugs resueltos ✅ — TypeScript: 0 errores ✅**

---

## Resumen por bug

### BUG-05 — Tabla de resumen sin días vacíos
- **Problema:** La tabla de resumen mensual solo mostraba los días que tenían registros. Los días sin movimiento (domingos, feriados, etc.) no aparecían en la tabla.
- **Causa:** La tabla se construía iterando `movimientosDelMes` (solo los que venían de BD), sin generar todos los días del mes.
- **Fix:** `Array.from({ length: diasEnMes })` genera los 30/31 días; los días sin registro muestran ceros.

### BUG-06 — TPV: pagoTarjeta no se recalculaba
- **Problema:** Al editar o borrar un cobro TPV, el campo `pagoTarjeta` del MovimientoDiario correspondiente no se actualizaba. El resumen seguía mostrando el valor anterior.
- **Causa:** Las rutas `PUT /api/tpv/[id]` y `DELETE /api/tpv/[id]` no llamaban ningún recálculo después de modificar el cobro.
- **Fix:** Se agregó `recalcularPagoTarjetaDia()` en ambas rutas (luego consolidado en BUG-08 con el helper centralizado).

### BUG-07 — Selector de mes no actualizaba totales
- **Problema:** Al cambiar el mes desde el selector en la pantalla de resumen, los totales de las cards superiores no cambiaban. Seguían mostrando los datos del mes anterior.
- **Causa:** El `useEffect` que recargaba datos no tenía `mesSeleccionado` en su array de dependencias.
- **Fix:** Se agregó `mesSeleccionado` al array de dependencias del `useEffect` de carga de datos.

### BUG-08 — Sincronización MovimientoDiario (12 operaciones)
- **Problema:** Al crear/editar/borrar un gasto, cobro TPV, depósito o fondo inicial, el registro diario MovimientoDiario no se actualizaba. Los totales quedaban desactualizados.
- **Causa:** Las 12 rutas de API no llamaban ningún recálculo después de cada operación.
- **Fix:** Función centralizada `recalcularMovimientoDiario.ts` en `src/lib/`. Las 12 rutas la llaman con una línea. Patrón SOLID: un único lugar de mantenimiento.

### BUG-09 — Días futuros con saldo arrastrado
- **Problema:** El mes actual mostraba días futuros (ej: 13/05 a 31/05 cuando hoy es 12/05) con ceros en ventas pero con el saldo acumulado del último día real.
- **Causa:** El generador de días no distinguía entre mes actual y meses pasados — generaba siempre todos los días del mes.
- **Fix:** `_diasAMostrar = esMesActual ? Math.min(hoy.getDate(), diasEnMes) : diasEnMes`

### BUG-10 — Fechas UTC desfasadas
- **Problema:** El último día de cada mes aparecía en cero aunque tuviera datos. En meses de 31 días el día 31 nunca mostraba datos.
- **Causa:** `new Date(isoString).getMonth()` convierte UTC a hora local (UTC-6) → desfase de -1 día. Una fecha "2026-04-01T00:00:00.000Z" se leía como 31 de marzo.
- **Fix:** `(mov.fecha as string).split('T')[0]` — extrae la fecha del string ISO directamente, sin conversión de zona horaria.

### BUG-11 — AbonosCredito no sumaba al Saldo del Día
- **Problema:** Saldo del Día más bajo de lo real cuando había abonos de crédito (pagos de clientes a su deuda).
- **Causa:** La fórmula omitía `+ totalAbonosCredito` en los 3 puntos de cálculo del archivo.
- **Fix:** Fórmula corregida: `ventas - credito + abonos - recargas - tarjeta - transf - gastos` aplicada en `movimientosPorDia`, `calcularResumen()` y `exportarAExcel()`.

### BUG-12 — Contador de gastos incluía ventas
- **Problema:** "Mostrando 9 de 12 gastos" cuando solo había 9 gastos reales (12 = ventas + gastos).
- **Causa:** `movimientos.length` contaba todos los tipos de movimiento.
- **Fix:** `gastos.length` — variable ya definida como `movimientos.filter(m => m.tipo === 'GASTO')`.

### BUG-13 — Fondo de Caja Inicial mostraba suma acumulada
- **Problema:** Con 12 registros de $2,000 en el mes, la card mostraba $24,000 en vez de $2,000.
- **Causa:** `.reduce((sum, f) => sum + f.monto, 0)` sumaba todos los registros del mes.
- **Fix:** Ordenar desc por fecha y tomar `fondosOrdenados[0].monto` (el más reciente). Label: "Total del Mes" → "Último monto registrado".

### BUG-14 — Imágenes sin zoom en TPV
- **Problema:** Miniaturas de comprobantes de pago en la tabla no se podían ampliar para verificar.
- **Causa:** Los `<img>` en la tabla no tenían handler de click.
- **Fix:** `onClick={(e) => { e.stopPropagation(); handleRowClick(tpv) }}` en miniaturas desktop y mobile de TPV. Depósitos ya lo tenía.

### BUG-15 — Excel: fechas -1 día y saldo incorrecto
- **Problema:** Todas las fechas del Excel aparecían un día antes; el Saldo Acumulado no coincidía con la tabla en pantalla.
- **Causa:** `new Date(dia.fecha)` en `exportarAExcel` causaba el mismo desfase UTC de BUG-10. Además dependía del array `movimientosPorDia` que podía estar muteado por `.sort()`.
- **Fix:** Refactorizado `exportarAExcel` para leer desde `movimientosDelMes` con `split('T')[0]`. Fechas construidas como strings puros `"YYYY-MM-DD"` sin objetos `Date`. Campos leídos directamente del registro DB.

### BUG-16 — Texto blanco invisible en selectores de Mes/Año
- **Problema:** En todos los dashboards, el selector de mes (input type="month") mostraba texto blanco sobre fondo blanco — la selección no se podía leer.
- **Causa:** El navegador en modo oscuro aplicaba `color-scheme: dark` a los inputs, haciendo el texto blanco. La clase `.input-field` no forzaba colores explícitos.
- **Fix:** Una sola línea en `globals.css` cubre todos los dashboards: `.input-field { @apply ... bg-white text-gray-900; color-scheme: light; }`. El `resumen/page.tsx` usa `<select>` separados con `style={{ colorScheme: 'light', color: '#111827' }}` inline.

### BUG-17 — Etiqueta "Totales del Mes" incorrecta
- **Problema:** Las cards de estadísticas decían "Totales del Mes" pero mostraban promedios, no sumas totales.
- **Causa:** Etiqueta incorrecta desde el diseño inicial.
- **Fix:** Cambiado a "Promedio del Mes" en `resumen/page.tsx`, `movimientos/page.tsx` y `depositos/page.tsx`.

---

## Corrupción de archivos pre-existente (detectada y reparada 2026-05-13)

Durante el test de compilación se encontraron 3 archivos corruptos en el repositorio:

| Archivo | Problema | Reparación |
|---------|---------|-----------|
| `tpv/page.tsx` | Truncado dentro del modal de Error (mid-tag) | Completado el modal + cierre del componente |
| `fondo-caja-inicial/page.tsx` | Truncado en modal de confirmación de borrado | Completado botón Eliminar + cierre del modal |
| `movimientos-individuales/page.tsx` | Bytes nulos (`^@`) al final del archivo | Eliminados con `tr -d '\000'` |

---

*Para el informe en PDF ver: `Bugs_Resueltos_Gestion.pdf`*
