/**
 * Utilidades para manejo de fechas sin horarios
 * Evita problemas de zona horaria usando solo fechas
 */

/**
 * Convierte una fecha string (YYYY-MM-DD) a Date sin horario
 * @param dateString - Fecha en formato YYYY-MM-DD
 * @returns Date object con horario 00:00:00 UTC
 */
export function parseDateOnly(dateString: string): Date {
  if (!dateString) {
    throw new Error('Fecha requerida')
  }
  
  // Crear fecha con horario 00:00:00 UTC para evitar problemas de zona horaria
  return new Date(dateString + 'T00:00:00.000Z')
}

/**
 * Convierte una fecha a string en formato YYYY-MM-DD
 * @param date - Date object
 * @returns String en formato YYYY-MM-DD
 */
export function formatDateOnly(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 * @returns String en formato YYYY-MM-DD
 */
export function getCurrentDateOnly(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Crea un rango de fechas para consultas (inicio y fin del día)
 * @param dateString - Fecha en formato YYYY-MM-DD
 * @returns Objeto con fechaInicio y fechaFin
 */
export function createDateRange(dateString: string) {
  const fechaInicio = parseDateOnly(dateString)
  const fechaFin = new Date(fechaInicio)
  fechaFin.setUTCDate(fechaFin.getUTCDate() + 1) // Siguiente día
  fechaFin.setUTCMilliseconds(fechaFin.getUTCMilliseconds() - 1) // 23:59:59.999
  
  return {
    fechaInicio,
    fechaFin
  }
}

/**
 * Crea un rango de fechas para un mes específico
 * @param year - Año
 * @param month - Mes (1-12)
 * @returns Objeto con fechaInicio y fechaFin del mes
 */
export function createMonthRange(year: number, month: number) {
  const fechaInicio = new Date(year, month - 1, 1)
  fechaInicio.setUTCHours(0, 0, 0, 0)
  
  const fechaFin = new Date(year, month, 0) // Último día del mes
  fechaFin.setUTCHours(23, 59, 59, 999)
  
  return {
    fechaInicio,
    fechaFin
  }
}

/**
 * Muestra una fecha sin conversión de zona horaria
 * @param date - Date object o string de fecha
 * @returns String en formato DD/MM/YYYY
 */
export function displayDateOnly(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Usar UTC para evitar conversión de zona horaria
  const day = dateObj.getUTCDate().toString().padStart(2, '0')
  const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = dateObj.getUTCFullYear()
  
  return `${day}/${month}/${year}`
}

/**
 * Muestra una fecha en formato largo sin conversión de zona horaria
 * @param date - Date object o string de fecha
 * @returns String en formato DD/MM/YYYY
 */
export function displayDateOnlyES(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Usar UTC para evitar conversión de zona horaria
  const day = dateObj.getUTCDate().toString().padStart(2, '0')
  const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = dateObj.getUTCFullYear()
  
  return `${day}/${month}/${year}`
}
