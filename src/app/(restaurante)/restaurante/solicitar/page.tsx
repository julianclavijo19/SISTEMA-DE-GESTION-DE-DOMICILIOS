'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { PaperPlaneTilt } from '@/lib/icons'

const schema = z.object({
  nombre_cliente: z.string().min(2, 'Nombre requerido'),
  telefono_cliente: z.string().min(7, 'Teléfono requerido'),
  direccion_entrega: z.string().min(5, 'Dirección requerida'),
  observaciones: z.string().optional(),
  valor_pedido: z.coerce.number().positive('El valor debe ser mayor a 0'),
})

export default function SolicitarDomicilioPage() {
  const supabase = createSupabaseBrowser()
  const router = useRouter()

  const [restauranteId, setRestauranteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    nombre_cliente: '',
    telefono_cliente: '',
    direccion_entrega: '',
    observaciones: '',
    valor_pedido: '',
  })

  const cargarRestaurante = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!usuario) return

    const { data: rest } = await supabase
      .from('restaurantes')
      .select('id')
      .eq('usuario_id', usuario.id)
      .single()

    if (rest) setRestauranteId(rest.id)
  }, [supabase])

  useEffect(() => {
    cargarRestaurante()
  }, [cargarRestaurante])

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!restauranteId) {
      toast.error('No se encontró el restaurante')
      return
    }

    const result = schema.safeParse(form)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    setLoading(true)

    // Get commission config
    const { data: config } = await supabase
      .from('configuracion_sistema')
      .select('porcentaje_comision')
      .limit(1)
      .single()

    const porcentaje = Number(config?.porcentaje_comision ?? 20)
    const comision = Math.round(result.data.valor_pedido * porcentaje / 100)

    const { error } = await supabase.from('domicilios').insert({
      restaurante_id: restauranteId,
      nombre_cliente: result.data.nombre_cliente,
      telefono_cliente: result.data.telefono_cliente,
      direccion_entrega: result.data.direccion_entrega,
      observaciones: result.data.observaciones || null,
      valor_pedido: result.data.valor_pedido,
      porcentaje_comision: porcentaje,
      comision_empresa: comision,
      estado: 'PENDIENTE',
    })

    setLoading(false)

    if (error) {
      toast.error('Error creando domicilio: ' + error.message)
      return
    }

    toast.success('¡Domicilio solicitado! Una secretaria lo asignará pronto.')
    setForm({
      nombre_cliente: '',
      telefono_cliente: '',
      direccion_entrega: '',
      observaciones: '',
      valor_pedido: '',
    })
    router.push('/restaurante/rastreo')
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Solicitar domicilio</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre_cliente">Nombre del cliente</Label>
              <Input
                id="nombre_cliente"
                value={form.nombre_cliente}
                onChange={(e) => handleChange('nombre_cliente', e.target.value)}
                placeholder="Nombre completo"
              />
              {errors.nombre_cliente && (
                <p className="text-sm text-destructive">{errors.nombre_cliente}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono_cliente">Teléfono del cliente</Label>
              <Input
                id="telefono_cliente"
                value={form.telefono_cliente}
                onChange={(e) =>
                  handleChange('telefono_cliente', e.target.value)
                }
                placeholder="3001234567"
              />
              {errors.telefono_cliente && (
                <p className="text-sm text-destructive">
                  {errors.telefono_cliente}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion_entrega">Dirección de entrega</Label>
              <Input
                id="direccion_entrega"
                value={form.direccion_entrega}
                onChange={(e) =>
                  handleChange('direccion_entrega', e.target.value)
                }
                placeholder="Calle 10 #5-23, Barrio Centro"
              />
              {errors.direccion_entrega && (
                <p className="text-sm text-destructive">
                  {errors.direccion_entrega}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones del pedido</Label>
              <Textarea
                id="observaciones"
                value={form.observaciones}
                onChange={(e) =>
                  handleChange('observaciones', e.target.value)
                }
                placeholder="2x Hamburguesa especial, 1x Gaseosa..."
                rows={3}
              />
              {errors.observaciones && (
                <p className="text-sm text-destructive">
                  {errors.observaciones}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_pedido">Valor del pedido (COP)</Label>
              <Input
                id="valor_pedido"
                type="number"
                value={form.valor_pedido}
                onChange={(e) => handleChange('valor_pedido', e.target.value)}
                placeholder="25000"
                min={0}
              />
              {errors.valor_pedido && (
                <p className="text-sm text-destructive">
                  {errors.valor_pedido}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <PaperPlaneTilt className="h-4 w-4 mr-2" />
              {loading ? 'Enviando...' : 'Solicitar domicilio'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
