'use client'

import { useState } from 'react'
import { Crosshair, LayoutDashboard, Mail, Settings, Send, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DashboardView from '@/components/views/dashboard-view'
import CampaignsView from '@/components/views/campaigns-view'
import SendersView from '@/components/views/senders-view'
import SettingsView from '@/components/views/settings-view'
import CampaignDetailView from '@/components/views/campaign-detail'

type View = 'dashboard' | 'campaigns' | 'campaign-detail' | 'senders' | 'settings'

const navItems = [
  { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'campaigns' as View, label: 'Campañas', icon: Mail },
  { id: 'senders' as View, label: 'Remitentes', icon: Send },
  { id: 'settings' as View, label: 'Configuración', icon: Settings },
]

export default function Home() {
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)

  function openCampaignDetail(campaignId: string) {
    setSelectedCampaignId(campaignId)
    setActiveView('campaign-detail')
  }

  function renderView() {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />
      case 'campaigns':
        return <CampaignsView onSelectCampaign={openCampaignDetail} />
      case 'campaign-detail':
        return selectedCampaignId ? (
          <div>
            <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={() => setActiveView('campaigns')}>
              <ArrowLeft className="h-4 w-4" />
              Volver a Campañas
            </Button>
            <CampaignDetailView campaignId={selectedCampaignId} />
          </div>
        ) : (
          <CampaignsView onSelectCampaign={openCampaignDetail} />
        )
      case 'senders':
        return <SendersView />
      case 'settings':
        return <SettingsView />
      default:
        return <DashboardView />
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <a href="https://utilbox.online" class="back-suite">← Suite de Soluciones </a>
            <div className="flex items-center gap-2">
              <Crosshair className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-lg font-bold leading-tight">SenderX · v1.0</h1>
                <p className="text-[11px] text-muted-foreground leading-tight">Cold email hiper-personalizado · IA</p>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = activeView === item.id || (item.id === 'campaigns' && activeView === 'campaign-detail')
              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView(item.id)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {renderView()}
      </main>

      {/* Footer */}
      <footer>© 2026 Senderx</footer>
    </div>
  )
}