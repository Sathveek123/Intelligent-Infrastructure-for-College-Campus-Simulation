export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return

  const headers = Object.keys(data[0])

  const escape = (value: unknown) => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
    return str
  }

  const csv = [headers.join(','), ...data.map((row) => headers.map((h) => escape(row[h])).join(','))].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
