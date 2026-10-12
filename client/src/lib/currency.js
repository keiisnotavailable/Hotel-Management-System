const phpFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

export function formatPHP(value) {
  return phpFormatter.format(Number(value) || 0)
}
