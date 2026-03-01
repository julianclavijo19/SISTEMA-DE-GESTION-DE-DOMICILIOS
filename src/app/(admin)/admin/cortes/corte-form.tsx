'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { generarCorteCaja, previsualizarCorte } from './actions'

interface Props {
  usuarioId: string
}

type PreviewData = Awaited<ReturnType<typeof previsualizarCorte>>

export function CorteCajaForm({ usuarioId }: Props) {
  const hoy = new Date().toISOString().split('T')[0]
  const hace7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [fechaInicio, setFechaInicio] = useState(hace7)
  const [fechaFin, setFechaFin] = useState(hoy)
  const [loading, setLoading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)

  function formatCOP(value: number) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value)
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault()
    if (!fechaInicio || !fechaFin) { toast.error('Selecciona ambas fechas'); return }
    if (new Date(fechaInicio) > new Date(fechaFin)) { toast.error('La fecha de inicio debe ser anterior a la fecha fin'); return }

    setPreviewing(true)
    try {
      const data = await previsualizarCorte({ fechaInicio, fechaFin })
      setPreview(data)
      if (data.totalDomicilios === 0) {
        toast.info('No hay domicilios entregados en ese rango de fechas')
      }
    } catch (err) {
      toast.error('Error generando previsualización')
    } finally {
      setPreviewing(false)
    }
  }

  async function handleConfirmar() {
    setLoading(true)
    try {
      await generarCorteCaja({ fechaInicio, fechaFin, creadoPorId: usuarioId })
      toast.success('Corte de caja guardado exitosamente')
      setPreview(null)
    } catch (err) {
      toast.error('Error al guardar el corte de caja')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Date picker form */}
      <form onSubmit={handlePreview} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fechaInicio">Fecha inicio</Label>
            <Input
              id="fechaInicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => { setFechaInicio(e.target.value); setPreview(null) }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fechaFin">Fecha fin</Label>
            <Input
              id="fechaFin"
              type="date"
              value={fechaFin}
              onChange={(e) => { setFechaFin(e.target.value); setPreview(null) }}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setFechaInicio(hoy); setFechaFin(hoy); setPreview(null) }}
          >
            Hoy
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setFechaInicio(hace7); setFechaFin(hoy); setPreview(null) }}
          >
            Última semana
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              setFechaInicio(hace30); setFechaFin(hoy); setPreview(null)
            }}
          >
            Último mes
          </Button>
        </div>
        <Button type="submit" disabled={previewing} variant="secondary">
          {previewing ? 'Calculando...' : '📊 Previsualizar corte'}
        </Button>
      </form>

      {/* Preview results */}
      {preview && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2">
          <Separator />
          <h3 className="font-semibold text-lg">Previsualización del corte</h3>
          <p className="text-sm text-muted-foreground">
            {new Date(fechaInicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' — '}
            {new Date(fechaFin).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold">{preview.totalDomicilios}</p>
                <p className="text-xs text-muted-foreground">Entregas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{formatCOP(preview.totalBruto)}</p>
                <p className="text-xs text-muted-foreground">Total bruto</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-green-700">{formatCOP(preview.totalComisiones)}</p>
                <p className="text-xs text-muted-foreground">Comisión empresa</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-orange-600">{formatCOP(preview.totalPagoDomiciliarios)}</p>
                <p className="text-xs text-muted-foreground">Pago domiciliarios</p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown by restaurant */}
          {preview.porRestaurante.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Desglose por restaurante</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {preview.porRestaurante.map((r) => (
                    <div key={r.nombre} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.nombre}</span>
                        <Badge variant="secondary" className="text-[10px]">{r.pedidos} pedidos</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <span className="text-muted-foreground">{formatCOP(r.bruto)}</span>
                        <span className="font-semibold text-green-700">{formatCOP(r.comision)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Breakdown by domiciliario */}
          {preview.porDomiciliario.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Desglose por domiciliario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {preview.porDomiciliario.map((d) => (
                    <div key={d.nombre} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{d.nombre}</span>
                        <Badge variant="secondary" className="text-[10px]">{d.entregas} entregas</Badge>
                      </div>
                      <span className="text-muted-foreground">{formatCOP(d.bruto)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confirm button */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleConfirmar}
              disabled={loading || preview.totalDomicilios === 0}
              className="flex-1"
            >
              {loading ? 'Guardando...' : '✅ Confirmar y guardar corte de caja'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setPreview(null)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
