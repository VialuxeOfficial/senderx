'use client'
import { useState, useEffect } from 'react'

export default function CampaignDetailsPage({ params }: { params: { id: string } }) {
  const campaignId = params.id
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLeads = async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/leads`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (campaignId) {
      fetchLeads()
    }
  }, [campaignId])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    const text = await file.text()
    const lines = text.split('\n')
    
    const parsedLeads = lines.slice(1).map(line => {
      const cols = line.split(',')
      return {
        email: cols[0]?.trim(),
        firstName: cols[1]?.trim(),
        company: cols[2]?.trim(),
        title: cols[3]?.trim(),
      }
    }).filter(l => l.email && l.email.includes('@'))

    const res = await fetch(`/api/campaigns/${campaignId}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: parsedLeads }),
    })

    if (res.ok) {
      alert('Leads cargados correctamente')
      fetchLeads()
    } else {
      alert('Error al guardar los leads')
    }
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Campaña</h1>
          <p className="text-sm text-gray-500">ID: {campaignId}</p>
        </div>
        <div>
          <label className="bg-black text-white px-4 py-2 rounded text-sm font-medium cursor-pointer hover:bg-gray-800">
            {loading ? 'Subiendo...' : '+ Importar Leads (CSV)'}
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" disabled={loading} />
          </label>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b text-gray-600 font-semibold">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Empresa</th>
              <th className="p-3">Cargo</th>
              <th className="p-3">ICP Score</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No hay leads subidos a esta campaña. Sube un archivo CSV con las columnas: email, nombre, empresa, cargo.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{lead.email}</td>
                  <td className="p-3">{lead.firstName || '-'}</td>
                  <td className="p-3">{lead.company || '-'}</td>
                  <td className="p-3">{lead.title || '-'}</td>
                  <td className="p-3 font-bold text-blue-600">{lead.icpScore ?? 'Pendiente'}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 font-medium">
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}