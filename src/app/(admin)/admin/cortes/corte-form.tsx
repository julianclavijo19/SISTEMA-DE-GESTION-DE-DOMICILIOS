'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { generarCorteCaja } from './actions'

interface Props {
  usuarioId: string
}

export function CorteCajaForm({ usuarioId }: Props) {
  const hoy = new Date().toISOString().split('T')[0]
  const hace7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [fechaInicio, setFechaInicio] = useState(hace7)
  const [fechaFin, setFechaFin] = useState(hoy)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fechaInicio || !fechaFin) { toast.error('Selecciona ambas fechas'); return }
    if (new Date(fechaInicio) > new Date(fechaFin)) { toast.error('La fecha de inicio debe ser anterior a la fecha fin'); return }

    setLoading(true)
    try {
      await generarCorteCaja({ fechaInicio, fechaFin, creadoPorId: usuarioId })
      toast.success('Corte de caja generado exitosamente')
    } catch (err) {
      toast.error('Error al generar el corte de caja')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fechaInicio">Fecha inicio</Label>
          <Input id="fechaInicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fechaFin">Fecha fin</Label>
          <Input id="fechaFin" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
        </div>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Generando...' : 'Generar corte de caja'}
      </Button>
    </form>
  )
}
