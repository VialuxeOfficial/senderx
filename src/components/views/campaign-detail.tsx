'use client'

import { useEffect, useState, useCallback } from 'react'
import Papa from 'papaparse'
import {
  Crosshair, Edit2, Save, Users, Mail, Send, FileUp,
  Sparkles, CheckCircle, XCircle, Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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

interface Lead {
  id: string
  email: string
  name: string
  company: string
  status: string
  icpScore: number
}

interface Email {
  id: string
  subject: string
  status: string
  sentAt: string | null
  openedAt: string | null
}

interface Sender {
  id: string
  name: string
  email: string
}

interface CampaignData {
  id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  icp: string
  leads: Lead[]
  emails: Email[]
  senders: Sender[]
  followup1: string
  followup2: string
  followup3: string
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  completed: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
}

const leadStatusIcon: Record<string, typeof CheckCircle> = {
  qualified: CheckCircle,
  sent: Send,
  replied: Mail,
  bounced: XCircle,
  pending: Clock,
}

interface CampaignDetailProps {
  campaignId: string
}

export default function CampaignDetailView({ campaignId }: CampaignDetailProps) {
  const { toast } = useToast()
  const [campaign, setCampaign] = useState<CampaignData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [generating, setGenerating] = useState(false)

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`)
      if (res.ok) {
        const data = await res.json()
        const normalizedData: CampaignData = {
          ...data,
          leads: Array.isArray(data.leads) ? data.leads : [],
          emails: Array.isArray(data.emails) ? data.emails : [],
          senders: Array.isArray(data.senders) ? data.senders : [],
        }
        setCampaign(normalizedData)
        setEditName(normalizedData.name ?? '')
      } else {
        toast({ title: 'Error', description: 'Campaign not found', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load campaign', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [campaignId, toast])

  useEffect(() => {
    fetchCampaign()
  }, [fetchCampaign])

  const handleSaveName = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      })
      if (res.ok) {
        setCampaign((prev) => (prev ? { ...prev, name: editName } : prev))
        setEditing(false)
        toast({ title: 'Saved', description: 'Campaign name updated' })
      } else {
        throw new Error('Save failed')
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update campaign', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleQualify = async (leadId: string) => {
    try {
      const res = await fetch('/api/leads/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      if (res.ok) toast({ title: 'Qualified', description: 'Lead marked as qualified' })
      else throw new Error('Qualify failed')
    } catch {
      toast({ title: 'Error', description: 'Failed to qualify lead', variant: 'destructive' })
    }
  }

  const handleSendSingle = async (leadId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/send-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      })
      if (res.ok) toast({ title: 'Email Sent', description: 'Email queued for delivery' })
      else throw new Error('Send failed')
    } catch {
      toast({ title: 'Error', description: 'Failed to send email', variant: 'destructive' })
    }
  }

  const handleImport = async () => {
    if (!csvFile) return
    setImporting(true)
    try {
      const text = await csvFile.text()
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
      const rawLeads = parsed.data as Record<string, string>[]

      // Normalización para mapear columnas comunes de Apollo y otros CSV
      const leads = rawLeads
        .map((row) => ({
          email: row.email || row['Email'] || row['Email Address'] || '',
          name:
            row.name ||
            row['Name'] ||
            row['Full Name'] ||
            `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim(),
          company: row.company || row['Company'] || row['Company Name'] || '',
        }))
        .filter((l) => l.email)

      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, leads }),
      })

      const result = await res.json().catch(() => ({}))

      if (res.ok) {
        toast({
          title: 'Import Complete',
          description: `${result.imported ?? leads.length} leads imported`,
        })
        setImportOpen(false)
        setCsvFile(null)
        fetchCampaign()
      } else {
        throw new Error(result.error || 'Import failed')
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to import leads',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  const handleGenerateSequence = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/generate-sequence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        setCampaign((prev) =>
          prev
            ? {
                ...prev,
                followup1: data.followup1 ?? prev.followup1,
                followup2: data.followup2 ?? prev.followup2,
                followup3: data.followup3 ?? prev.followup3,
              }
            : prev
        )
        toast({ title: 'Sequence Generated', description: 'Follow-up templates created' })
      } else {
        throw new Error('Generate failed')
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to generate sequence', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Campaign not found</p>
      </div>
    )
  }

  const leads = campaign.leads ?? []
  const emails = campaign.emails ?? []
  const senders = campaign.senders ?? []

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Crosshair className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            {editing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 w-64"
                />
                <Button size="sm" onClick={handleSaveName} disabled={saving}>
                  <Save className="mr-1 h-3 w-3" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{campaign.name}</h1>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setEditing(true)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Badge className={statusColors[campaign.status] ?? ''} variant="secondary">
                {campaign.status}
              </Badge>
              <span className="text-sm text-muted-foreground">SenderX &middot; v1.0</span>
            </div>
          </div>
        </div>
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <FileUp className="mr-1 h-4 w-4" /> Import CSV
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Leads from CSV</DialogTitle>
              <DialogDescription>
                Upload a CSV file with columns: email, name, company
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="csv">CSV File</Label>
                <Input
                  id="csv"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={!csvFile || importing}>
                {importing ? 'Importing...' : 'Import'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">
            <Users className="mr-1 h-4 w-4" /> Leads
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="mr-1 h-4 w-4" /> Emails
          </TabsTrigger>
          <TabsTrigger value="senders">
            <Send className="mr-1 h-4 w-4" /> Senders
          </TabsTrigger>
          <TabsTrigger value="sequence">
            <Sparkles className="mr-1 h-4 w-4" /> Sequence
          </TabsTrigger>
        </TabsList>

        {/* Leads Tab */}
        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Leads ({leads.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No leads yet. Import a CSV to get started.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">ICP Score</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((lead) => {
                        const StatusIcon = leadStatusIcon[lead.status] ?? Clock
                        return (
                          <TableRow key={lead.id}>
                            <TableCell className="font-medium">{lead.email}</TableCell>
                            <TableCell>{lead.name || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {lead.company || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="gap-1">
                                <StatusIcon className="h-3 w-3" /> {lead.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {lead.icpScore?.toFixed?.(1) ?? '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQualify(lead.id)}
                                >
                                  Qualify
                                </Button>
                                <Button size="sm" onClick={() => handleSendSingle(lead.id)}>
                                  Send
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
        </TabsContent>

        {/* Emails Tab */}
        <TabsContent value="emails">
          <Card>
            <CardHeader>
              <CardTitle>Emails ({emails.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {emails.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No emails sent yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent At</TableHead>
                        <TableHead>Opened At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emails.map((email) => (
                        <TableRow key={email.id}>
                          <TableCell className="font-medium">{email.subject}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{email.status}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {email.sentAt ? new Date(email.sentAt).toLocaleString() : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {email.openedAt ? new Date(email.openedAt).toLocaleString() : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Senders Tab */}
        <TabsContent value="senders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Assigned Senders
                <Button size="sm" variant="outline">
                  Assign Sender
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {senders.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No senders assigned. Assign a sender to start sending emails.
                </p>
              ) : (
                <div className="space-y-3">
                  {senders.map((sender) => (
                    <div
                      key={sender.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{sender.name}</p>
                        <p className="text-sm text-muted-foreground">{sender.email}</p>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sequence Tab */}
        <TabsContent value="sequence">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Follow-up Sequence
                <Button size="sm" onClick={handleGenerateSequence} disabled={generating}>
                  <Sparkles className="mr-1 h-4 w-4" />{' '}
                  {generating ? 'Generating...' : 'Generate with AI'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Follow-up #1</Label>
                <Separator />
                <Textarea
                  rows={4}
                  value={campaign.followup1 || ''}
                  onChange={(e) =>
                    setCampaign((prev) => (prev ? { ...prev, followup1: e.target.value } : prev))
                  }
                  placeholder="Write sequence or click 'Generate with AI'..."
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Follow-up #2</Label>
                <Separator />
                <Textarea
                  rows={4}
                  value={campaign.followup2 || ''}
                  onChange={(e) =>
                    setCampaign((prev) => (prev ? { ...prev, followup2: e.target.value } : prev))
                  }
                  placeholder="Write sequence or click 'Generate with AI'..."
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Follow-up #3</Label>
                <Separator />
                <Textarea
                  rows={4}
                  value={campaign.followup3 || ''}
                  onChange={(e) =>
                    setCampaign((prev) => (prev ? { ...prev, followup3: e.target.value } : prev))
                  }
                  placeholder="Write sequence or click 'Generate with AI'..."
                  className="bg-background"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}