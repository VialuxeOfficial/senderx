'use client'

import { useEffect, useState } from 'react'
import { Crosshair, Plus, Plug, Unplug, Loader2, Server, TestTube } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

interface Sender {
  id: string
  name: string
  email: string
  dailyLimit: number
  sentToday: number
  isActive: boolean
  smtpHost: string
  imapHost: string
}

const emptyForm = {
  name: '',
  email: '',
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPass: '',
  imapHost: '',
  imapPort: '993',
  imapUser: '',
  imapPass: '',
  dailyLimit: '50',
}

export default function SendersView() {
  const { toast } = useToast()
  const [senders, setSenders] = useState<Sender[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [testing, setTesting] = useState<Record<string, { smtp?: boolean; imap?: boolean }>>({})

  const fetchSenders = async () => {
    try {
      const res = await fetch('/api/senders')
      if (res.ok) {
        const data = await res.json()
        setSenders(Array.isArray(data) ? data : data.senders ?? [])
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load senders', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSenders()
  }, [])

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: 'Validation', description: 'Name and email are required', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/senders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          smtpPort: Number(form.smtpPort),
          imapPort: Number(form.imapPort),
          dailyLimit: Number(form.dailyLimit),
        }),
      })
      if (res.ok) {
        toast({ title: 'Sender Created', description: `"${form.name}" is ready` })
        setDialogOpen(false)
        setForm(emptyForm)
        fetchSenders()
      } else {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Create failed')
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create sender', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/senders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (res.ok) {
        setSenders((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isActive } : s))
        )
        toast({ title: isActive ? 'Activated' : 'Deactivated', description: `Sender ${isActive ? 'enabled' : 'disabled'}` })
      } else {
        throw new Error('Toggle failed')
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to toggle sender', variant: 'destructive' })
    }
  }

  const handleTestSmtp = async (id: string) => {
    setTesting((prev) => ({ ...prev, [id]: { ...prev[id], smtp: true } }))
    try {
      const res = await fetch(`/api/senders/${id}/test-smtp`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast({ title: 'SMTP Test Passed', description: data.message ?? 'Connection successful' })
      } else {
        toast({ title: 'SMTP Test Failed', description: data.error ?? 'Connection failed', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'SMTP test request failed', variant: 'destructive' })
    } finally {
      setTesting((prev) => ({ ...prev, [id]: { ...prev[id], smtp: false } }))
    }
  }

  const handleTestImap = async (id: string) => {
    setTesting((prev) => ({ ...prev, [id]: { ...prev[id], imap: true } }))
    try {
      const res = await fetch(`/api/senders/${id}/test-imap`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast({ title: 'IMAP Test Passed', description: data.message ?? 'Connection successful' })
      } else {
        toast({ title: 'IMAP Test Failed', description: data.error ?? 'Connection failed', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'IMAP test request failed', variant: 'destructive' })
    } finally {
      setTesting((prev) => ({ ...prev, [id]: { ...prev[id], imap: false } }))
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
            <h1 className="text-xl font-bold tracking-tight">Senders</h1>
            <p className="text-sm text-muted-foreground">SenderX &middot; v1.0</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> New Sender
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Sender</DialogTitle>
              <DialogDescription>Configure a new email sending account with SMTP &amp; IMAP credentials.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="s-name">Name *</Label>
                <Input id="s-name" placeholder="John Sender" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="s-email">Email *</Label>
                <Input id="s-email" type="email" placeholder="john@company.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>

              <Separator />
              <p className="text-sm font-semibold text-muted-foreground">SMTP Configuration</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="s-smtpHost">SMTP Host</Label>
                  <Input id="s-smtpHost" placeholder="smtp.gmail.com" value={form.smtpHost} onChange={(e) => setForm((f) => ({ ...f, smtpHost: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="s-smtpPort">Port</Label>
                  <Input id="s-smtpPort" type="number" placeholder="587" value={form.smtpPort} onChange={(e) => setForm((f) => ({ ...f, smtpPort: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="s-smtpUser">SMTP User</Label>
                  <Input id="s-smtpUser" placeholder="john@company.com" value={form.smtpUser} onChange={(e) => setForm((f) => ({ ...f, smtpUser: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="s-smtpPass">SMTP Password</Label>
                  <Input id="s-smtpPass" type="password" placeholder="••••••••" value={form.smtpPass} onChange={(e) => setForm((f) => ({ ...f, smtpPass: e.target.value }))} />
                </div>
              </div>

              <Separator />
              <p className="text-sm font-semibold text-muted-foreground">IMAP Configuration</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="s-imapHost">IMAP Host</Label>
                  <Input id="s-imapHost" placeholder="imap.gmail.com" value={form.imapHost} onChange={(e) => setForm((f) => ({ ...f, imapHost: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="s-imapPort">Port</Label>
                  <Input id="s-imapPort" type="number" placeholder="993" value={form.imapPort} onChange={(e) => setForm((f) => ({ ...f, imapPort: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="s-imapUser">IMAP User</Label>
                  <Input id="s-imapUser" placeholder="john@company.com" value={form.imapUser} onChange={(e) => setForm((f) => ({ ...f, imapUser: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="s-imapPass">IMAP Password</Label>
                  <Input id="s-imapPass" type="password" placeholder="••••••••" value={form.imapPass} onChange={(e) => setForm((f) => ({ ...f, imapPass: e.target.value }))} />
                </div>
              </div>

              <Separator />
              <div className="grid gap-2">
                <Label htmlFor="s-dailyLimit">Daily Limit</Label>
                <Input id="s-dailyLimit" type="number" placeholder="50" value={form.dailyLimit} onChange={(e) => setForm((f) => ({ ...f, dailyLimit: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Add Sender'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Senders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" /> Sender Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : senders.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No senders configured. Add one to start sending emails.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Daily Limit</TableHead>
                    <TableHead className="text-right">Sent Today</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {senders.map((s) => {
                    const senderTesting = testing[s.id] ?? {}
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground">{s.email}</TableCell>
                        <TableCell className="text-right">{s.dailyLimit}</TableCell>
                        <TableCell className="text-right">
                          <span className={s.sentToday >= s.dailyLimit ? 'text-destructive font-semibold' : ''}>
                            {s.sentToday}
                          </span>
                          <span className="text-muted-foreground">/{s.dailyLimit}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={s.isActive}
                              onCheckedChange={(v) => handleToggleActive(s.id, v)}
                            />
                            <Badge variant={s.isActive ? 'default' : 'secondary'} className={s.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : ''}>
                              {s.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTestSmtp(s.id)}
                              disabled={senderTesting.smtp}
                            >
                              {senderTesting.smtp ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <TestTube className="mr-1 h-3 w-3" />
                              )}
                              SMTP
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTestImap(s.id)}
                              disabled={senderTesting.imap}
                            >
                              {senderTesting.imap ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <TestTube className="mr-1 h-3 w-3" />
                              )}
                              IMAP
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
