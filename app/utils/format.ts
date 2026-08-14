/**
 * Standardized Formatting Utility Functions for WarungKu
 */

/**
 * Format standard numeric values into Indonesian Rupiah currency string.
 * Example: 12500 -> "Rp 12.500"
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp 0'
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Format numbers with thousand dot separators without currency prefix.
 * Example: 12500 -> "12.500"
 */
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) {
    return '0'
  }
  return new Intl.NumberFormat('id-ID').format(n)
}

/**
 * Format ISO date strings or Date objects into human-readable Indonesian locale text.
 * Example: "2026-08-13T20:00:00Z" -> "13 Agu 2026, 20:00"
 */
export function formatDate(
  isoString: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!isoString) return '-'

  const date = typeof isoString === 'string' ? new Date(isoString) : isoString
  if (isNaN(date.getTime())) return '-'

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }

  return new Intl.DateTimeFormat('id-ID', options || defaultOptions).format(date)
}

/**
 * Format ISO date string into Indonesian relative time (e.g., "baru saja", "2 jam lalu", "3 hari lalu").
 */
export function formatRelativeTime(isoString: string | Date | null | undefined): string {
  if (!isoString) return '-'

  const date = typeof isoString === 'string' ? new Date(isoString) : isoString
  if (isNaN(date.getTime())) return '-'

  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'baru saja'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} menit lalu`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} jam lalu`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) {
    return `${diffInDays} hari lalu`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths} bulan lalu`
  }

  const diffInYears = Math.floor(diffInMonths / 12)
  return `${diffInYears} tahun lalu`
}
