'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Crosshair, Megaphone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

interface Campaign {
  id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  icp: string
  leadsCount: number
  sendersCount: number
  createdAt: string
}

interface CampaignsViewProps {
  onSelectCampaign?: (campaignId: string) => void
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  completed: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
}

const emptyForm = {
  name: '',
  icp: '',
  promptContext: '',
  systemInstruction: '',
  abEnabled: false,
  sendingWindowStart: '09:00',
  sendingWindowEnd: '18:00',
  skipWeekends: true,
}

export default function CampaignsView({ onSelectCampaign }: CampaignsViewProps) {
  const { toast } = useToast()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns')
      if (res.ok) {
        const data = await res.json()
        setCampaigns(Array.isArray(data) ? data : data.campaigns ?? [])
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load campaigns', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Validation', description: 'Campaign name is required', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast({ title: 'Campaign Created', description: `"${form.name}" is ready` })
        setDialogOpen(false)
        setForm(emptyForm)
        fetchCampaigns()
      } else {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Create failed')
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create campaign', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Deleted', description: 'Campaign removed' })
        setCampaigns((prev) => prev.filter((c) => c.id !== id))
      } else {
        throw new Error('Delete failed')
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete campaign', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Crosshair className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Campaigns</h1>
            <p className="text-sm text-muted-foreground">SenderX &middot; v1.0</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
              <DialogDescription>Set up a new cold email campaign with AI personalization.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" placeholder="Q1 SaaS Founders Outreach" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="icp">ICP (Ideal Customer Profile)</Label>
                <Input id="icp" placeholder="SaaS founders, 10-50 employees, Series A" value={form.icp} onChange={(e) => setForm((f) => ({ ...f, icp: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promptContext">Prompt Context</Label>
                <Textarea id="promptContext" placeholder="Additional context for AI email generation..." rows={3} value={form.promptContext} onChange={(e) => setForm((f) => ({ ...f, promptContext: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="systemInstruction">System Instruction</Label>
                <Textarea id="systemInstruction" placeholder="Custom instructions for the AI model..." rows={3} value={form.systemInstruction} onChange={(e) => setForm((f) => ({ ...f, systemInstruction: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="abEnabled">A/B Testing</Label>
                <Switch id="abEnabled" checked={form.abEnabled} onCheckedChange={(v) => setForm((f) => ({ ...f, abEnabled: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Sending Window Start</Label>
                  <Input type="time" value={form.sendingWindowStart} onChange={(e) => setForm((f) => ({ ...f, sendingWindowStart: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Sending Window End</Label>
                  <Input type="time" value={form.sendingWindowEnd} onChange={(e) => setForm((f) => ({ ...f, sendingWindowEnd: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="skipWeekends">Skip Weekends</Label>
                <Switch id="skipWeekends" checked={form.skipWeekends} onCheckedChange={(v) => setForm((f) => ({ ...f, skipWeekends: v }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Campaign'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> All Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No campaigns yet. Click &ldquo;New Campaign&rdquo; to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ICP</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Senders</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          onClick={() => onSelectCampaign?.(c.id)}
                          className="text-left hover:underline text-primary font-semibold cursor-pointer"
                        >
                          {c.name}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[c.status] ?? ''} variant="secondary">
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{c.icp || '—'}</TableCell>
                      <TableCell className="text-right">{c.leadsCount}</TableCell>
                      <TableCell className="text-right">{c.sendersCount}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &ldquo;{c.name}&rdquo;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(c.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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