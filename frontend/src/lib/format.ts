export function formatPercent(v: number) {
  return `${Math.round(v)}%`
}

export function formatKwh(v: number) {
  return `${v.toFixed(1)} kWh`
}
