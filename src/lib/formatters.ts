export function formatNumberMX(
  value: number | string | null | undefined,
  options: Intl.NumberFormatOptions = {}
): string {
  const amount = Number(value ?? 0)
  const safeAmount = Number.isFinite(amount) ? amount : 0
  const roundedAmount = roundCurrency(safeAmount)
  const minimumFractionDigits = options.minimumFractionDigits ?? 0
  const maximumFractionDigits = options.maximumFractionDigits ?? 2
  const isNegative = roundedAmount < 0
  const absoluteAmount = Math.abs(roundedAmount)
  const fixedValue = absoluteAmount.toFixed(maximumFractionDigits)
  const [integerPart, decimalPart = ''] = fixedValue.split('.')
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const trimmedDecimal = decimalPart.replace(/0+$/, '')
  const shouldShowDecimals =
    maximumFractionDigits > 0 &&
    (trimmedDecimal.length > 0 || minimumFractionDigits > 0)
  const paddedDecimal = shouldShowDecimals
    ? decimalPart.slice(0, Math.max(trimmedDecimal.length, minimumFractionDigits))
    : ''

  return `${isNegative ? '-' : ''}${groupedInteger}${shouldShowDecimals ? `.${paddedDecimal}` : ''}`
}

export function formatCurrencyMX(
  value: number | string | null | undefined,
  options: Intl.NumberFormatOptions = {}
): string {
  return `$${formatNumberMX(value, options)}`
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
