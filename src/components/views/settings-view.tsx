'use client'

import { useEffect, useState } from 'react'
import { Crosshair, Save, Database, Download, Upload, Loader2, CheckCircle, Cpu } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface Settings {
  aiProvider: string
  aiApiKey: string
  aiModel: string
}

interface Backup {
  filename: string
  createdAt: string
  size: number
}

export default function SettingsView() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<Settings>({
    aiProvider: 'zai',
    aiApiKey: '',
    aiModel: '',
  })
  const [backups, setBackups] = useState<Backup[]>([])
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [loadingBackups, setLoadingBackups] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<string>('')

  // Load settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          setSettings((prev) => ({
            ...prev,
            aiProvider: data.aiProvider ?? prev.aiProvider,
            aiApiKey: data.aiApiKey ?? prev.aiApiKey,
            aiModel: data.aiModel ?? prev.aiModel,
          }))
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' })
      } finally {
        setLoadingSettings(false)
      }
    }
    fetchSettings()
  }, [toast])

  // Load backups
  useEffect(() => {
    async function fetchBackups() {
      try {
        const res = await fetch('/api/db/backups')
        if (res.ok) {
          const data = await res.json()
          setBackups(Array.isArray(data) ? data : data.backups ?? [])
        }
      } catch {
        // backups may be empty, non-critical
      } finally {
        setLoadingBackups(false)
      }
    }
    fetchBackups()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        toast({ title: 'Settings Saved', description: 'AI configuration updated' })
      } else {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Save failed')
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestAi = async () => {
    setTesting(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, testConnection: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        toast({ title: 'AI Connection OK', description: data.message ?? 'Successfully connected to AI provider' })
      } else {
        toast({ title: 'AI Connection Failed', description: data.error ?? 'Could not connect', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Test request failed', variant: 'destructive' })
    } finally {
      setTesting(false)
    }
  }

  const handleCreateBackup = async () => {
    setCreatingBackup(true)
    try {
      const res = await fetch('/api/db/backup', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        toast({ title: 'Backup Created', description: data.filename ?? 'Database backup saved' })
        // Refresh backups list
        const backupsRes = await fetch('/api/db/backups')
        if (backupsRes.ok) {
          const bData = await backupsRes.json()
          setBackups(Array.isArray(bData) ? bData : bData.backups ?? [])
        }
      } else {
        throw new Error('Backup failed')
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create backup', variant: 'destructive' })
    } finally {
      setCreatingBackup(false)
    }
  }

  const handleRestore = async () => {
    if (!selectedBackup) {
      toast({ title: 'Validation', description: 'Select a backup to restore', variant: 'destructive' })
      return
    }
    setRestoring(true)
    try {
      const res = await fetch('/api/db/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedBackup }),
      })
      if (res.ok) {
        toast({ title: 'Restored', description: `Database restored from ${selectedBackup}` })
        setRestoreOpen(false)
        setSelectedBackup('')
      } else {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Restore failed')
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to restore backup', variant: 'destructive' })
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Crosshair className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">SenderX &middot; v1.0 &mdash; Configuration &amp; Backup</p>
        </div>
      </div>

      {/* AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" /> AI Provider Settings
          </CardTitle>
          <CardDescription>Configure the AI provider used for email generation and lead qualification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSettings ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="aiProvider">Provider</Label>
                <Select
                  value={settings.aiProvider}
                  onValueChange={(v) => setSettings((s) => ({ ...s, aiProvider: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zai">ZAI</SelectItem>
                    <SelectItem value="groq">Groq</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="aiApiKey">API Key</Label>
                <Input
                  id="aiApiKey"
                  type="password"
                  placeholder="sk-..."
                  value={settings.aiApiKey}
                  onChange={(e) => setSettings((s) => ({ ...s, aiApiKey: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="aiModel">Model</Label>
                <Input
                  id="aiModel"
                  placeholder="e.g. gpt-4o, llama-3.1-70b"
                  value={settings.aiModel}
                  onChange={(e) => setSettings((s) => ({ ...s, aiModel: e.target.value }))}
                />
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-4 w-4" />
                  )}
                  Save Settings
                </Button>
                <Button variant="outline" onClick={handleTestAi} disabled={testing}>
                  {testing ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-1 h-4 w-4" />
                  )}
                  Test Connection
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" /> Backup &amp; Restore
          </CardTitle>
          <CardDescription>Protect your data with automatic backups. Restore from a previous snapshot.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCreateBackup} disabled={creatingBackup}>
              {creatingBackup ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1 h-4 w-4" />
              )}
              Create Backup
            </Button>
            <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-1 h-4 w-4" /> Restore
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Restore Database</DialogTitle>
                  <DialogDescription>Select a backup file to restore. This will replace all current data.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Select Backup</Label>
                    <Select value={selectedBackup} onValueChange={setSelectedBackup}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a backup file" />
                      </SelectTrigger>
                      <SelectContent>
                        {backups.length === 0 ? (
                          <SelectItem value="none" disabled>No backups available</SelectItem>
                        ) : (
                          backups.map((b) => (
                            <SelectItem key={b.filename} value={b.filename}>
                              {b.filename} ({new Date(b.createdAt).toLocaleDateString()})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRestoreOpen(false)}>Cancel</Button>
                  <Button onClick={handleRestore} disabled={!selectedBackup || restoring}>
                    {restoring ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-1 h-4 w-4" />
                    )}
                    Restore
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Separator />

          {/* Backup List */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Available Backups</h3>
            {loadingBackups ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : backups.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No backups yet. Create one to protect your data.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {backups.map((b) => (
                  <div key={b.filename} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{b.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(b.createdAt).toLocaleString()}
                          {b.size ? ` · ${(b.size / 1024).toFixed(1)} KB` : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Saved</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
