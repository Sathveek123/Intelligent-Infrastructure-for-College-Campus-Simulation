import type { PredictedMaintenance } from '@/types'
import { fetchBuildings, fetchMaintenance, fetchRooms } from '@/services/mockData'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const DISMISSED_KEY = 'i2sf_dismissed_predictions_v1'

function readDismissed(): Record<string, true> {
  const raw = localStorage.getItem(DISMISSED_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, true>
  } catch {
    return {}
  }
}

function writeDismissed(next: Record<string, true>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(next))
}

export async function fetchActivePredictions() {
  const [buildings, rooms, maintenance] = await Promise.all([fetchBuildings(), fetchRooms(), fetchMaintenance()])
  const dismissed = readDismissed()
  const openCount = maintenance.filter((m) => m.status !== 'completed').length

  // Basic local heuristic predictions: create a few items based on campus state
  const predictions: PredictedMaintenance[] = []
  const now = new Date()
  const datePlusDays = (d: number) => {
    const x = new Date(now)
    x.setDate(x.getDate() + d)
    return x.toISOString().slice(0, 10)
  }

  for (let i = 0; i < Math.min(6, buildings.length); i++) {
    const b = buildings[i]
    const id = `pred_b_${b.id}`
    if (dismissed[id]) continue
    const risk = clamp(Math.round((seededRandom(i + openCount) * 100 + (b.baseEnergyLoad ?? 0) / 2) / 2), 10, 95)
    predictions.push({
      id,
      buildingId: b.id,
      buildingName: b.buildingName,
      buildingCode: b.buildingCode,
      predictedAt: new Date().toISOString(),
      predictedReason: risk > 75 ? 'Electrical load imbalance risk' : 'HVAC maintenance recommended',
      confidence: clamp(Math.round(55 + seededRandom(i + 7) * 40), 50, 95),
      source: risk > 70 ? 'energy_threshold' : 'health_score',
      priority: risk > 80 ? 'critical' : risk > 65 ? 'high' : 'medium',
      estimatedDate: datePlusDays(7 + i * 3),
      status: 'pending',
    })
  }

  for (let i = 0; i < Math.min(6, rooms.length); i++) {
    const r = rooms[i]
    const id = `pred_r_${r.id}`
    if (dismissed[id]) continue
    const risk = clamp(Math.round(seededRandom(i + 99) * 100), 10, 95)
    const b = buildings.find((x) => x.id === r.buildingId)
    predictions.push({
      id,
      buildingId: r.buildingId,
      buildingName: b?.buildingName,
      buildingCode: b?.buildingCode,
      predictedAt: new Date().toISOString(),
      predictedReason: `${r.roomNumber}: ${risk > 70 ? 'Equipment overheating risk' : 'Calibration recommended'}`,
      confidence: clamp(Math.round(50 + seededRandom(i + 31) * 45), 50, 95),
      source: risk > 70 ? 'stress_analysis' : 'health_score',
      priority: risk > 85 ? 'critical' : risk > 70 ? 'high' : 'medium',
      estimatedDate: datePlusDays(5 + i * 2),
      status: 'pending',
    })
  }

  return predictions.slice(0, 12)
}

export async function runPredictiveAnalysis() {
  // Local mode: analysis is instantaneous
  await fetchActivePredictions()
  return { message: 'Predictive analysis completed (local mode).' }
}

export async function convertToScheduled(maintenanceId: string, data: { actualDate: string; actualCost?: number }) {
  // Local mode: treat as dismiss + confirmation
  const dismissed = readDismissed()
  dismissed[maintenanceId] = true
  writeDismissed(dismissed)
  return { message: `Converted to scheduled locally for ${data.actualDate}` }
}

export async function dismissPrediction(maintenanceId: string, reason: string) {
  const dismissed = readDismissed()
  dismissed[maintenanceId] = true
  writeDismissed(dismissed)
  return { message: `Dismissed locally: ${reason}` }
}
