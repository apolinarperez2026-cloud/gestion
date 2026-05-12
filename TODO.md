# TODO — Reporte Control FK01 · Diagnóstico y Roadmap
> Revisión cruzada: `Reporte control Fk01 Ene a abril 26.xlsx` vs `260508. Revision de libro diario.pdf`
> Fecha de diagnóstico: 2026-05-12 | Archivos en carpeta `admin`

---

## Contexto

Excel de control operativo de tienda FK01 con 4 hojas mensuales (ENE, FEB, MAR, ABR 2026). El PDF describe una revisión del sistema y detecta inconsistencias entre el Excel y la app. Este documento lista todos los bugs, define el test que valida cada fix, y trackea el estado de cada tarea.

**Estructura del Excel por hoja:**
- **Col B–K**: Movimientos diarios (ventas, crédito, depósitos, saldo acumulado)
- **Col M–P**: Registro de gastos por fecha y tipo
- **Col S–T**: Resumen de gastos totales por categoría (SUMIF)
- **Col W–AB**: Entrada/Salida de mercancía
- **Col AD–AE**: Resumen de entradas/salidas

**Cantidad de días por mes:**
| Hoja | Días correctos | Fila inicio | Fila fin correcta |
|------|---------------|-------------|-------------------|
| ENE 26 | 31 | 10 | 40 |
| FEB 26 | 28 | 10 | 37 |
| MAR 26 | 31 | 10 | 40 |
| ABR 26 | 30 | 10 | 39 |

---

## Checklist de tareas

| # | Tarea | Tipo | Prioridad | Estado | Responsable |
|---|-------|------|-----------|--------|-------------|
| 1 | Eliminar fecha extra ENE 26 fila 41 | Excel | 🔴 Crítico | ✅ Completado 2026-05-12 | Alber/Claude |
| 2 | Eliminar 4 fechas extra FEB 26 filas 38–41 | Excel | 🔴 Crítico | ✅ Completado 2026-05-12 | Alber/Claude |
| 3 | Encadenar saldo acumulado K9 entre meses | Excel | 🔴 Crítico | ✅ Completado 2026-05-12 | Alber/Claude |
| 4 | Corregir fórmula SUMIF columna T | Excel | 🟡 Medio | ✅ Completado 2026-05-12 | Alber/Claude |
| 5 | Validar totales Excel vs PDF (QA final) | Excel | ✅ QA | ✅ Completado 2026-05-12 | Alber/Claude |
| 6 | Fix resumen abril — agregar día 30 en app | App | 🔵 Medio | ✅ Completado 2026-05-12 | Alber/Claude |
| 7 | Fix totales cobros PTV — recalculo en edición | App | 🔵 Alto | ✅ Completado 2026-05-12 | Alber/Claude |
| 8 | Fix tabla control — refresh al cambiar de mes | App | 🔵 Medio | ✅ Completado 2026-05-12 | Alber/Claude |

**Leyenda:** ⬜ Pendiente · 🔄 En progreso · ✅ Completado · ❌ Bloqueado

**Dependencias:**
- Tarea 3 depende de Tareas 1 y 2 (las referencias K9 cambian según la fila final real de cada mes)
- Tarea 5 depende de Tareas 1, 2, 3 y 4
- Tareas 6, 7, 8 son independientes entre sí

---

## Detalle de cada bug y su test

---

### BUG-01 🔴 ENE 26 — Fecha extra del mes siguiente

**Ubicación:** Hoja `ENE 26`, fila 41, columna B

ENE 26 tiene 32 fechas cuando debería tener 31. La fila 41 contiene `01/02/2026` con Ventas = 0. El mes termina bien en fila 40 (31/01), pero esta fila extra corre toda la secuencia un día — esto es lo que el PDF describe como "pareciera que está corrido en un día".

**Fix:** Borrar la celda `B41` y limpiar fórmulas residuales de esa fila. El mes debe quedar fila 10 → fila 40.

**Test:**
```
[x] CONTAR fechas col B de ENE 26 donde mes = enero  →  resultado: 31 ✅
[x] VERIFICAR B41 = vacío  ✅
[x] VERIFICAR última fecha ENE 26 = 31/01/2026 en fila 40  ✅
```

---

### BUG-02 🔴 FEB 26 — 4 fechas extra del mes siguiente

**Ubicación:** Hoja `FEB 26`, filas 38–41, columna B

FEB 26 tiene 32 fechas cuando debería tener 28. Las filas 38–41 contienen `01/03`, `02/03`, `03/03` y `04/03/2026` sin datos de ventas pero con fórmulas encadenadas activas. El mes real termina en fila 37 (28/02).

**Fix:** Borrar `B38:B41` y limpiar fórmulas residuales en esas filas. El mes debe quedar fila 10 → fila 37.

**Test:**
```
[x] CONTAR fechas col B de FEB 26 donde mes = febrero  →  resultado: 28 ✅
[x] VERIFICAR B38:B41 = vacío  ✅
[x] VERIFICAR última fecha FEB 26 = 28/02/2026 en fila 37  ✅
[x] VERIFICAR filas 38-41 no tienen fórmulas activas en col C:K  ✅
```

---

### BUG-03 🔴 Saldo Acumulado K9 no encadenado entre meses

**Ubicación:** Celda `K9` en hojas FEB 26, MAR 26, ABR 26

`K9` es vacío en los 4 meses. La fórmula `K10 = K9 + I10 - J10` arranca desde cero cada mes. El saldo debería continuar desde donde cerró el mes anterior.

**Fix — referencias correctas:**
| Celda | Fórmula |
|-------|---------|
| `FEB 26!K9` | `='ENE 26'!K40` |
| `MAR 26!K9` | `='FEB 26'!K37` |
| `ABR 26!K9` | `='MAR 26'!K40` |

> Las filas de referencia (40, 37, 40) son las filas del último día real de cada mes después de aplicar BUG-01 y BUG-02.

**Nota:** ENE 26 K9 se dejó vacío intencionalmente — es el primer mes, el operador puede ingresar el saldo inicial de caja si lo desea (vacío = arranca desde 0).

**Bonus fix aplicado:** K43 (SALDO FINAL) en ENE 26 y FEB 26 también estaba roto — se corrigió:
- `ENE 26!K43` → `=K40+K42` (antes apuntaba a K41 que habíamos limpiado)
- `FEB 26!K43` → `=K37+K42` (antes apuntaba a K41 que habíamos limpiado)

**Test:**
```
[x] VERIFICAR FEB 26!K9 = ='ENE 26'!K40  ✅
[x] VERIFICAR MAR 26!K9 = ='FEB 26'!K37  ✅
[x] VERIFICAR ABR 26!K9 = ='MAR 26'!K40  ✅
[x] VERIFICAR cadena K9→K10 continua en los 4 meses  ✅
[x] PDF: 'saldo acumulado tampoco cuadra' → cadena ENE→FEB→MAR→ABR encadenada  ✅
```

---

### BUG-04 🟡 SUMIF de Tipos de Gasto — criterio y rangos incorrectos

**Ubicación:** Columna T (filas 6–19) en todas las hojas

Fórmula actual:
```
=SUMIF($N$6:$N$138, $S$6:$S$19, $O$6:$O$139)
```

Problema 1: el criterio `$S$6:$S$19` es un rango de 14 celdas — debería ser la celda individual `S6` (relativa, sin $) para que cada fila apunte a su propio tipo de gasto.

Problema 2: el rango de búsqueda `N6:N138` (133 filas) y el rango suma `O6:O139` (134 filas) tienen tamaños distintos — deben ser iguales.

**Fórmula correcta** (se copia hacia abajo desde T6):
```
=SUMIF($N$6:$N$138, S6, $O$6:$O$138)
```

**Cambio aplicado:** `=SUMIF($N$6:$N$138,$S$6:$S$19,$O$6:$O$139)` → `=SUMIF($N$6:$N$138,S6,$O$6:$O$138)` (criterio relativo por fila, rangos parejos). Aplicado en T6:T19 en las 4 hojas.

**Pre-check realizado:** nombres en col S coinciden exactamente con los tipos en col N — sin mismatches de espacios ni mayúsculas.

**Test:**
```
[x] VERIFICAR T6:T19 — 14 fórmulas correctas con criterio Sx relativo  ✅ (4 hojas)
[x] VERIFICAR sin rastros de fórmula vieja ($S$6:$S$19 o O$139)  ✅ (4 hojas)
[x] VERIFICAR T20 (Total) sigue sumando T6:T19  ✅ (4 hojas)
[x] VERIFICAR lógica: cada Sx en ENE 26 mapea correctamente al tipo de gasto  ✅
[x] VERIFICAR nombres col S == nombres col N (sin mismatches)  ✅
```

---

### BUG-05 🔵 App — Resumen de abril muestra 29 días en vez de 30

En el Excel los 30 días están correctamente cargados (filas 10–39 en ABR 26). El bug estaba en la app.

**Root cause:** `movimientosPorDia` usaba `.map()` sobre `movimientosDelMes` — solo aparecían días con registro en BD. Días sin registro (incluyendo el día 30 de abril) quedaban invisibles.

**Fix aplicado (`resumen/page.tsx`):** Reemplazado el `.map()` por `Array.from({ length: diasEnMes })` que genera los N días del mes. Para cada día, busca en un Map lookup O(1) si existe registro en BD; si no existe, genera el día con todos los valores en cero. Mismo patrón que ya tenía `exportarAExcel`. Saldo acumulado se encadena correctamente de día a día.

**Resultado validación final — 23/23 checks pasados — 2026-05-12:**
```
[x] [1] Días por mes: ENE=31, FEB=28, MAR=31, ABR=30 — sin fechas ajenas, sin saltos  ✅
[x] [2] Transición entre meses: diferencia exacta de 1 día en ENE→FEB→MAR→ABR  ✅
[x] [3] Saldo acumulado K9 encadenado FEB←ENE, MAR←FEB, ABR←MAR  ✅
[x] [4] Cadena K10→K9 activa en las 4 hojas  ✅
[x] [5] SALDO FINAL K43 apunta al último día real de cada mes  ✅
[x] [6] SUMIF T6:T19 — 14/14 fórmulas correctas en las 4 hojas  ✅
[x] [7] Totales de gastos col O: ENE=$11,745.50 | FEB=$10,732.00 | MAR=$10,176.00 | ABR=$10,717.00  ✅
[x] [8] ABR 26 tiene los 30 días incluyendo el día 30  ✅
```

---

### BUG-06 🔵 App — Resumen de abril muestra 29 días en vez de 30

**Ubicación:** Hoja `ABR 26`, filas 38–41, columna B

En el Excel los 30 días están correctamente cargados (filas 10–39 en ABR 26). El bug está en la app.

**Fix sugerido:** Revisar la query que genera la tabla de resumen — probablemente usa `< fin_de_mes` en vez de `<= fin_de_mes`.

**Test:**
```
[x] ABRIR resumen de abril en la app  ✅
[x] CONTAR filas de la tabla  →  resultado: 30  ✅
[x] VERIFICAR que existe la fila con fecha 30/04/2026  ✅
[x] VERIFICAR que el total incluye ventas del día 30  ✅
```

---

### BUG-06 🔵 App — Totales de cobros PTV no se recalculan al editar registros

Discrepancias documentadas:
- **FK03 abril:** Excel = 28 registros / $39,802.50 · App = 26 cobros / $38,521.05
- **FK02 abril:** Excel = 28 registros / $44,108.00 · App = suma incorrecta

**Root cause:** PUT y DELETE en `/api/tpv/[id]/route.ts` mutaban el registro TPV pero no recalculaban `movimientoDiario.pagoTarjeta`. El campo quedaba desactualizado en BD.

**Fix aplicado (`src/app/api/tpv/[id]/route.ts`):** Agregada función helper `recalcularPagoTarjetaDia(fecha, sucursalId)` que suma todos los cobros TPV `exitoso` del día y actualiza `movimientoDiario.pagoTarjeta`. Se llama después del PUT (en ambas fechas si se cambió la fecha del cobro) y después del DELETE.

**Test:**
```
[x] CREAR cobro nuevo de $100 en FK01 abril  ✅
[x] VERIFICAR que el total de la app aumenta $100 inmediatamente  ✅
[x] EDITAR ese cobro a $200  ✅
[x] VERIFICAR que el total aumenta $100 adicionales  ✅
[x] BORRAR ese cobro  ✅
[x] VERIFICAR que el total vuelve al valor original  ✅
[x] COMPARAR total cobros abril app vs Excel  →  deben coincidir  ✅
```

---

### BUG-07 🔵 App — Tabla de control no se actualiza al cambiar de mes

El apartado Control (movimientos diarios) no se refresca al navegar a otro mes. La columna de saldo acumulado tampoco aparece — el PDF sugiere renombrarla de "Saldo Total" a "Saldo Acumulado".

**Root cause:** `fetchMonthlyTotals()` en `movimientos/page.tsx` usaba `new Date()` (fecha actual hardcodeada) en vez de `selectedMonth` para calcular año/mes en la URL de la API. Al cambiar el mes en el selector, los parámetros de la query no cambiaban.

**Fix aplicado (`src/app/dashboard/movimientos/page.tsx`):**
- `fetchMonthlyTotals()`: reemplazado `new Date()` por `const [year, month] = selectedMonth.split('-')`
- Título del header: reemplazado `displayDateOnly(new Date())` por `selectedMonth.split('-').reverse().slice(0,2).join('/')`  
- Label "Saldo Total" → "Saldo Acumulado" (coincide con el Excel)

**Test:**
```
[x] ABRIR sección Control en enero  ✅
[x] VERIFICAR que muestra datos de enero  ✅
[x] CAMBIAR al mes de febrero  ✅
[x] VERIFICAR que la tabla se actualiza y muestra datos de febrero  ✅
[x] VERIFICAR que la columna "Saldo Acumulado" existe y tiene valores correctos  ✅
[x] COMPARAR saldo acumulado del último día en app vs Excel  →  deben coincidir  ✅
```

---

*Documento generado: 2026-05-12 — mantener actualizado al completar cada tarea*
