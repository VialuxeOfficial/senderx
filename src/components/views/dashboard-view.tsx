'use client'

import { useEffect, useState } from 'react'
import { Crosshair, Mail, Users, Send, Eye, MessageCircle, Plus, RefreshCw, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

interface Stats {
  totalCampaigns: number
  activeCampaigns: number
  totalLeads: number
  sentEmails: number
  openRate: string
  repliedLeads: number
}

interface Campaign {
  id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  leadsCount: number
  createdAt: string
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  completed: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
}

export default function DashboardView() {
  const { toast } = useToast()
  const [stats, setStats] = useState<Stats | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, campaignsRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/campaigns'),
        ])

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }
        if (campaignsRes.ok) {
          const campaignsData = await campaignsRes.json()
          setCampaigns(Array.isArray(campaignsData) ? campaignsData : campaignsData.campaigns ?? [])
        }
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to load dashboard data', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [toast])

  const handleQuickAction = async (action: string) => {
    try {
      if (action === 'sync') {
        toast({ title: 'Syncing Inbox', description: 'Processing incoming replies...' })
        const res = await fetch('/api/cron/inbox', { method: 'POST' })
        if (res.ok) toast({ title: 'Inbox Synced', description: 'Replies processed successfully' })
        else throw new Error('Sync failed')
      } else if (action === 'process') {
        toast({ title: 'Processing Queue', description: 'Sending queued emails...' })
        const res = await fetch('/api/cron/send', { method: 'POST' })
        if (res.ok) toast({ title: 'Queue Processed', description: 'Emails sent successfully' })
        else throw new Error('Process failed')
      } else {
        toast({ title: 'New Campaign', description: 'Navigate to campaigns to create one' })
      }
    } catch {
      toast({ title: 'Error', description: `Failed to ${action}`, variant: 'destructive' })
    }
  }

  const kpis = [
    { label: 'Total Campaigns', value: stats?.totalCampaigns ?? 0, icon: Crosshair, color: 'text-emerald-600' },
    { label: 'Active Campaigns', value: stats?.activeCampaigns ?? 0, icon: Zap, color: 'text-amber-600' },
    { label: 'Total Leads', value: stats?.totalLeads ?? 0, icon: Users, color: 'text-sky-600' },
    { label: 'Emails Sent', value: stats?.sentEmails ?? 0, icon: Send, color: 'text-violet-600' },
    { label: 'Open Rate', value: stats?.openRate ?? '0%', icon: Eye, color: 'text-rose-600' },
    { label: 'Replies', value: stats?.repliedLeads ?? 0, icon: MessageCircle, color: 'text-teal-600' },
  ]

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Crosshair className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SenderX &middot; v1.0</h1>
            <p className="text-sm text-muted-foreground">Cold email hiper-personalizado &middot; IA</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleQuickAction('new')}>
            <Plus className="mr-1 h-4 w-4" /> New Campaign
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleQuickAction('sync')}>
            <RefreshCw className="mr-1 h-4 w-4" /> Sync Inbox
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleQuickAction('process')}>
            <Zap className="mr-1 h-4 w-4" /> Process Queue
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : kpis.map((kpi) => (
              <Card key={kpi.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    {kpi.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Recent Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No campaigns yet. Create your first one!</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.slice(0, 10).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[c.status] ?? ''} variant="secondary">
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{c.leadsCount}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
