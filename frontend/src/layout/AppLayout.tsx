import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '@/layout/Sidebar'
import Topbar from '@/layout/Topbar'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar variant="mobile" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="px-4 py-6 md:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
