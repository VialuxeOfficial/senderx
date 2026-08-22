'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Lead {
  id: string
  email: string
  firstName?: string
  lastName?: string
  company?: string
  title?: string
  icpScore?: number
  icpReason?: string
  status: string
}

interface Campaign {
  id: string
  name: string
  status: string
  icp?: string
  systemInstruction?: string
  qualifyPrompt?: string
  sequencePrompt?: string
  senderName?: string
  senderEmail?: string
  leads?: Lead[]
}

export default function CampaignDetailView({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [qualifying, setQualifying] = useState(false)
  const [qualifyingLeadId, setQualifyingLeadId] = useState<string | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  // Formulario local
  const [form, setForm] = useState({
    name: '',
    status: 'draft',
    icp: '',
    qualifyPrompt: '',
    sequencePrompt: '',
    senderName: '',
    senderEmail: '',
  })

  // Cargar datos de la campaña
  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`)
      if (res.ok) {
        const data: Campaign = await res.json()
        setCampaign(data)
        setForm({
          name: data.name || '',
          status: data.status || 'draft',
          icp: data.icp || '',
          qualifyPrompt: data.qualifyPrompt || '',
          sequencePrompt: data.sequencePrompt || '',
          senderName: data.senderName || '',
          senderEmail: data.senderEmail || '',
        })
      }
    } catch (err) {
      console.error('Error al cargar la campaña:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (campaignId) fetchCampaign()
  }, [campaignId])

  // Guardar cambios en ICP, Prompts y Sender
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        alert('Configuración guardada correctamente')
        fetchCampaign()
      } else {
        alert('Error al guardar la configuración')
      }
    } catch (err) {
      console.error(err)
      alert('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  // Calificar individualmente
  const qualifySingleLead = async (leadId: string) => {
    setQualifyingLeadId(leadId)
    try {
      const res = await fetch('/api/leads/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      if (res.ok) {
        await fetchCampaign()
      }
    } catch (err) {
      console.error('Error al calificar lead:', err)
    } finally {
      setQualifyingLeadId(null)
    }
  }

  // Calificación masiva en lotes con retraso (evita error 429 en Groq)
  const handleQualifyAll = async () => {
    if (!campaign?.leads?.length) return
    setQualifying(true)
    const leads = campaign.leads
    setProgress({ current: 0, total: leads.length })

    for (let i = 0; i < leads.length; i++) {
      await qualifySingleLead(leads[i].id)
      setProgress({ current: i + 1, total: leads.length })
      // Pausa de 1.5 segundos entre peticiones
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    setQualifying(false)
    alert('Todos los leads han sido procesados con IA.')
  }

  if (loading) return <div className="p-8 text-center text-gray-600">Cargando campaña...</div>
  if (!campaign) return <div className="p-8 text-center text-red-500 font-medium">Campaña no encontrada.</div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
          <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-medium capitalize mt-1 inline-block">
            {campaign.status}
          </span>
        </div>
        <button
          onClick={handleQualifyAll}
          disabled={qualifying || !campaign.leads?.length}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg shadow transition-colors disabled:opacity-50"
        >
          {qualifying
            ? `Calificando con IA (${progress.current}/${progress.total})...`
            : '✨ Calificar Todos los Leads'}
        </button>
      </div>

      {/* Formulario de Configuración de la Campaña */}
      <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-xl shadow-sm space-y-4 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Configuración e Instrucciones de IA</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre del Remitente</label>
            <input
              type="text"
              value={form.senderName}
              onChange={(e) => setForm({ ...form, senderName: e.target.value })}
              placeholder="Ej. Carlos Mendoza"
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email del Remitente</label>
            <input
              type="email"
              value={form.senderEmail}
              onChange={(e) => setForm({ ...form, senderEmail: e.target.value })}
              placeholder="Ej. carlos@utilbox.online"
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">ICP (Perfil de Cliente Ideal)</label>
          <textarea
            rows={2}
            value={form.icp}
            onChange={(e) => setForm({ ...form, icp: e.target.value })}
            placeholder="Ej. CEOs y Founders de Agencias de Marketing B2B con más de 10 empleados en Latam."
            className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Prompt de Calificación (Groq/IA)</label>
          <textarea
            rows={3}
            value={form.qualifyPrompt}
            onChange={(e) => setForm({ ...form, qualifyPrompt: e.target.value })}
            placeholder="Ej. Prioriza decisiones directas de compra. Descarta empresas sin sitio web o agencias de desarrollo."
            className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Prompt para Secuencia de Correo</label>
          <textarea
            rows={3}
            value={form.sequencePrompt}
            onChange={(e) => setForm({ ...form, sequencePrompt: e.target.value })}
            placeholder="Ej. Usa un tono cercano, enfocado en ahorro de costos de infraestructura. Máximo 120 palabras."
            className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg shadow transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios de Campaña'}
          </button>
        </div>
      </form>

      {/* Tabla de Leads */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Leads de la Campaña ({campaign.leads?.length || 0})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider font-semibold text-gray-600">
                <th className="p-3">Email</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Empresa</th>
                <th className="p-3">Score</th>
                <th className="p-3">Razón de Calificación</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaign.leads?.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 text-sm">
                  <td className="p-3 font-medium text-gray-900">{lead.email}</td>
                  <td className="p-3 text-gray-700">{lead.firstName} {lead.lastName}</td>
                  <td className="p-3 text-gray-700">{lead.company || '—'}</td>
                  <td className="p-3">
                    {lead.icpScore !== undefined && lead.icpScore !== null ? (
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-bold ${
                          lead.icpScore >= 70
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {lead.icpScore} / 100
                      </span>
                    ) : (
                      <span className="text-gray-400 italic text-xs">Sin calificar</span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-gray-600 max-w-xs truncate" title={lead.icpReason || ''}>
                    {lead.icpReason || '—'}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => qualifySingleLead(lead.id)}
                      disabled={qualifying || qualifyingLeadId === lead.id}
                      className="text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50"
                    >
                      {qualifyingLeadId === lead.id ? 'Calificando...' : 'Calificar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}