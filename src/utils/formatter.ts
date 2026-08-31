export const formatCurrency = (value: number, currency = 'IDR') =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(value)

export const formatDate = (value: Date | string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
