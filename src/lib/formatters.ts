export function formatNumberMX(
  value: number | string | null | undefined,
  options: Intl.NumberFormatOptions = {}
): string {
  const amount = Number(value ?? 0)

  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function formatCurrencyMX(
  value: number | string | null | undefined,
  options: Intl.NumberFormatOptions = {}
): string {
  const amount = Number(value ?? 0)

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function formatDateTimeMX(value: Date | string | null | undefined): string {
  if (!value) return 'N/A'

  return new Date(value).toLocaleString('es-MX')
}

export function roundCurrency(value: number | string | null | undefined): number {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return 0
  return Math.round((amount + Number.EPSILON) * 100) / 100
}
