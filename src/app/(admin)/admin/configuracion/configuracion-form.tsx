'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { X } from '@/lib/icons'
import { toast } from 'sonner'
import { actualizarConfiguracion } from './actions'

interface Props {
  porcentajeComision: number
  tiempoLimiteAceptacion: number
  motivosCancelacion: string[]
}

export function ConfiguracionForm({
  porcentajeComision: initialComision,
  tiempoLimiteAceptacion: initialTiempo,
  motivosCancelacion: initialMotivos,
}: Props) {
  const [porcentaje, setPorcentaje] = useState(initialComision)
  const [tiempo, setTiempo] = useState(initialTiempo)
  const [motivos, setMotivos] = useState<string[]>(initialMotivos)
  const [nuevoMotivo, setNuevoMotivo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await actualizarConfiguracion({
        porcentajeComision: porcentaje,
        tiempoLimiteAceptacion: tiempo,
        motivosCancelacion: motivos,
      })
      toast.success('Configuración actualizada correctamente')
    } catch {
      toast.error('Error al actualizar la configuración')
    } finally {
      setLoading(false)
    }
  }

  function agregarMotivo() {
    if (nuevoMotivo.trim() && !motivos.includes(nuevoMotivo.trim())) {
      setMotivos([...motivos, nuevoMotivo.trim()])
      setNuevoMotivo('')
    }
  }

  function eliminarMotivo(motivo: string) {
    setMotivos(motivos.filter((m) => m !== motivo))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="porcentaje">Porcentaje de comisión (%)</Label>
        <Input
          id="porcentaje"
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={porcentaje}
          onChange={(e) => setPorcentaje(Number(e.target.value))}
        />
        <p className="text-sm text-muted-foreground">
          Se aplica automáticamente a cada domicilio entregado.
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="tiempo">
          Tiempo límite de aceptación (segundos)
        </Label>
        <Input
          id="tiempo"
          type="number"
          min={60}
          max={1800}
          value={tiempo}
          onChange={(e) => setTiempo(Number(e.target.value))}
        />
        <p className="text-sm text-muted-foreground">
          Tiempo máximo para que un domiciliario acepte un pedido antes de alertar
          a la secretaria.
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Motivos de cancelación</Label>
        <div className="flex gap-2 flex-wrap">
          {motivos.map((motivo) => (
            <Badge key={motivo} variant="secondary" className="gap-1">
              {motivo}
              <button type="button" onClick={() => eliminarMotivo(motivo)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Agregar motivo..."
            value={nuevoMotivo}
            onChange={(e) => setNuevoMotivo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                agregarMotivo()
              }
            }}
          />
          <Button type="button" variant="outline" onClick={agregarMotivo}>
            Agregar
          </Button>
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
