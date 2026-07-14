import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L, { type DivIcon, type LatLngTuple } from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix default marker icons for Vite/ESM builds
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const GMRIT = {
  // Approximate coordinates for GMR Institute of Technology, Rajam
  // (Can be adjusted later if you want exact pin)
  lat: 18.4629,
  lng: 83.6596,
}

function MapClickReporter({ onMapClick }: { onMapClick?: (pos: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      const pos = { lat: e.latlng.lat, lng: e.latlng.lng }
      onMapClick?.(pos)
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`)
      }
    },
  })
  return null
}

const center: LatLngTuple = [GMRIT.lat, GMRIT.lng]

function createUserIcon(): DivIcon {
  return L.divIcon({
    className: 'i2sf-user-icon',
    html: `
      <div style="position: relative; width: 28px; height: 28px;">
        <div style="
          position: absolute; inset: 0;
          border-radius: 999px;
          background: rgba(59,130,246,1);
          border: 2px solid rgba(255,255,255,0.95);
          box-shadow: 0 10px 24px rgba(0,0,0,0.35);
        "></div>
        <div style="
          position: absolute; inset: -12px;
          border-radius: 999px;
          background: rgba(59,130,246,0.18);
          filter: blur(0px);
        "></div>
        <div style="
          position: absolute; inset: 0;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: rgba(255,255,255,0.95);
          font-weight: 900;
          font-size: 11px;
        ">YOU</div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

function MapControls({ userPos }: { userPos: LatLngTuple | null }) {
  const map = useMap()

  return (
    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, display: 'flex', gap: 8 }}>
      <button
        type="button"
        onClick={() => {
          map.flyTo(center, 16, { animate: true, duration: 0.7 })
        }}
        style={{
          borderRadius: 14,
          padding: '8px 10px',
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(2,6,23,0.55)',
          backdropFilter: 'blur(10px)',
          color: 'rgba(255,255,255,0.92)',
          fontSize: 12,
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        Campus
      </button>

      <button
        type="button"
        disabled={!userPos}
        onClick={() => {
          if (!userPos) return
          map.flyTo(userPos, Math.max(map.getZoom(), 17), { animate: true, duration: 0.7 })
        }}
        style={{
          borderRadius: 14,
          padding: '8px 10px',
          border: '1px solid rgba(255,255,255,0.14)',
          background: userPos ? 'rgba(37,99,235,0.70)' : 'rgba(2,6,23,0.35)',
          backdropFilter: 'blur(10px)',
          color: 'rgba(255,255,255,0.92)',
          fontSize: 12,
          fontWeight: 800,
          cursor: userPos ? 'pointer' : 'not-allowed',
          opacity: userPos ? 1 : 0.6,
        }}
      >
        My GPS
      </button>
    </div>
  )
}

export default function GmritLiveMapInner({
  isLight,
  onMapClick,
}: {
  isLight?: boolean
  onMapClick?: (pos: { lat: number; lng: number }) => void
}) {
  const userIcon = useMemo(() => createUserIcon(), [])

  const [userPos, setUserPos] = useState<LatLngTuple | null>(null)
  const [userAccuracyM, setUserAccuracyM] = useState<number | null>(null)
  const [gpsUpdatedAt, setGpsUpdatedAt] = useState<string | null>(null)
  const lastEmit = useRef(0)

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now()
        if (now - lastEmit.current < 900) return
        lastEmit.current = now
        setUserPos([pos.coords.latitude, pos.coords.longitude])
        setUserAccuracyM(Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null)
        setGpsUpdatedAt(new Date().toISOString())
      },
      (err) => {
        void err
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 },
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  return (
    <div className={isLight ? 'rounded-2xl overflow-hidden border border-slate-900/10' : 'rounded-2xl overflow-hidden border border-white/10'}>
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom={false}
        preferCanvas
        zoomAnimation={false}
        markerZoomAnimation={false}
        fadeAnimation={false}
        style={{ height: 360, width: '100%' }}
      >
        <MapControls userPos={userPos} />
        <MapClickReporter onMapClick={onMapClick} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          updateWhenIdle
          updateWhenZooming={false}
          keepBuffer={2}
        />

        {userPos ? (
          <Marker position={userPos} icon={userIcon}>
            <Popup>
              <div style={{ fontWeight: 800 }}>Your Live GPS Location</div>
              <div style={{ marginTop: 6 }}>Lat: {userPos[0].toFixed(6)}</div>
              <div>Lng: {userPos[1].toFixed(6)}</div>
              <div style={{ marginTop: 10, fontWeight: 700 }}>
                Accuracy: {typeof userAccuracyM === 'number' ? `${userAccuracyM} m` : '—'}
              </div>
              <div style={{ marginTop: 4 }}>
                Updated: {gpsUpdatedAt ? new Date(gpsUpdatedAt).toLocaleTimeString() : '—'}
              </div>
              {typeof userAccuracyM === 'number' && userAccuracyM > 80 ? (
                <div style={{ marginTop: 10, color: '#f59e0b', fontWeight: 800 }}>
                  Low accuracy detected. You may appear off-campus until GPS stabilizes.
                </div>
              ) : null}
            </Popup>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  )
}
