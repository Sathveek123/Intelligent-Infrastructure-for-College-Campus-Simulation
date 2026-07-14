import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, Zap } from 'lucide-react'
import Badge from '@/ui/Badge'
import Button from '@/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'

const sampleOccupancy = [
  { label: 'Mon', pct: 62 },
  { label: 'Tue', pct: 71 },
  { label: 'Wed', pct: 68 },
  { label: 'Thu', pct: 74 },
  { label: 'Fri', pct: 79 },
]

export default function BuildingDetailsPage() {
  const { id } = useParams()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/app/infrastructure/buildings"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="text-lg font-semibold text-white">Building Details</div>
            <div className="text-sm text-white/60">Building ID: {id}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline">Edit</Button>
          <Button>Run Simulation</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-semibold text-white/60">Current Status</div>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone="warning">Watch</Badge>
              <div className="text-sm text-white/70">Occupancy trending high</div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-white/60">Floors</div>
                <div className="mt-1 font-semibold text-white">4</div>
              </div>
              <div>
                <div className="text-xs text-white/60">Rooms</div>
                <div className="mt-1 font-semibold text-white">52</div>
              </div>
              <div>
                <div className="text-xs text-white/60">Occupancy</div>
                <div className="mt-1 font-semibold text-white">72%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Weekly Occupancy</CardTitle>
                <div className="mt-1 text-xs text-white/60">% utilization by day</div>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Zap className="h-4 w-4" />
                <span>Energy view in Analytics</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sampleOccupancy}>
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="pct" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rooms Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="text-sm font-semibold text-white">Available</div>
              <div className="mt-2 text-2xl font-semibold text-white">12</div>
              <div className="mt-2"><Badge tone="success">Healthy</Badge></div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="text-sm font-semibold text-white">Occupied</div>
              <div className="mt-2 text-2xl font-semibold text-white">36</div>
              <div className="mt-2"><Badge tone="warning">Busy</Badge></div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="text-sm font-semibold text-white">Maintenance</div>
              <div className="mt-2 text-2xl font-semibold text-white">4</div>
              <div className="mt-2"><Badge tone="danger">Action</Badge></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
