'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Clock,
  MapPin,
  Phone,
  User,
  Storefront,
  ArrowRight,
} from '@/lib/icons'

type EstadoDomicilio =
  | 'PENDIENTE'
  | 'NOTIFICADO'
  | 'ASIGNADO'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'CANCELADO'

interface Domicilio {
  id: string
  nombre_cliente: string
  telefono_cliente: string
  direccion_entrega: string
  observaciones: string | null
  valor_pedido: number
  estado: EstadoDomicilio
  creado_en: string
  domiciliarios?: {
    cedula: string
    usuarios: {
      nombre: string
      telefono: string
    }
  }
}

const ESTADO_STEPS: EstadoDomicilio[] = [
  'PENDIENTE',
  'NOTIFICADO',
  'ASIGNADO',
  'EN_CAMINO',
  'ENTREGADO',
]

const ESTADO_LABEL: Record<EstadoDomicilio, string> = {
  PENDIENTE: 'Esperando asignación',
  NOTIFICADO: 'Notificado',
  ASIGNADO: 'Domiciliario asignado',
  EN_CAMINO: 'En camino al cliente',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
}

const ESTADO_COLOR: Record<EstadoDomicilio, string> = {
  PENDIENTE: 'bg-yellow-500 text-white',
  NOTIFICADO: 'bg-blue-500 text-white',
  ASIGNADO: 'bg-indigo-500 text-white',
  EN_CAMINO: 'bg-purple-500 text-white',
  ENTREGADO: 'bg-green-500 text-white',
  CANCELADO: 'bg-red-500 text-white',
}

export default function RastreoPage() {
  const supabase = createSupabaseBrowser()
  const [domiciliosActivos, setDomiciliosActivos] = useState<Domicilio[]>([])
  const [restauranteId, setRestauranteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const cargarRestaurante = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!usuario) return null

    const { data: rest } = await supabase
      .from('restaurantes')
      .select('id')
      .eq('usuario_id', usuario.id)
      .single()

    if (rest) {
      setRestauranteId(rest.id)
      return rest.id
    }
    return null
  }, [supabase])

  const cargarDomicilios = useCallback(
    async (restId: string) => {
      const { data } = await supabase
        .from('domicilios')
        .select(`
          *,
          domiciliarios (cedula, usuarios(nombre, telefono))
        `)
        .eq('restaurante_id', restId)
        .not('estado', 'in', '("ENTREGADO","CANCELADO")')
        .order('creado_en', { ascending: false })

      setDomiciliosActivos((data as unknown as Domicilio[]) || [])
    },
    [supabase]
  )

  useEffect(() => {
    async function init() {
      setLoading(true)
      const restId = await cargarRestaurante()
      if (restId) await cargarDomicilios(restId)
      setLoading(false)
    }
    init()
  }, [cargarRestaurante, cargarDomicilios])

  // Realtime
  useEffect(() => {
    if (!restauranteId) return

    const channel = supabase
      .channel('restaurante-rastreo')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'domicilios' },
        () => {
          cargarDomicilios(restauranteId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, restauranteId, cargarDomicilios])

  function getProgress(estado: EstadoDomicilio) {
    if (estado === 'CANCELADO') return 0
    const idx = ESTADO_STEPS.indexOf(estado)
    return ((idx + 1) / ESTADO_STEPS.length) * 100
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rastreo en vivo</h1>
        <p className="text-muted-foreground">
          {domiciliosActivos.length} domicilios activos
        </p>
      </div>

      {domiciliosActivos.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            No hay domicilios en curso en este momento
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {domiciliosActivos.map((dom) => (
            <Card key={dom.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {dom.nombre_cliente}
                  </CardTitle>
                  <Badge className={ESTADO_COLOR[dom.estado]}>
                    {ESTADO_LABEL[dom.estado]}
                  </Badge>
                </div>
                <Progress value={getProgress(dom.estado)} className="mt-2" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  {ESTADO_STEPS.map((step) => (
                    <span
                      key={step}
                      className={
                        ESTADO_STEPS.indexOf(dom.estado) >=
                        ESTADO_STEPS.indexOf(step)
                          ? 'text-foreground font-medium'
                          : ''
                      }
                    >
                      {step === 'EN_CAMINO'
                        ? 'En camino'
                        : step.charAt(0) + step.slice(1).toLowerCase()}
                    </span>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{dom.direccion_entrega}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{dom.telefono_cliente}</span>
                </div>

                <Separator />

                <p className="text-muted-foreground">{dom.observaciones}</p>

                <div className="flex justify-between">
                  <span className="font-medium">Valor:</span>
                  <span className="font-bold">
                    {formatCurrency(dom.valor_pedido)}
                  </span>
                </div>

                {dom.domiciliarios && (
                  <div className="flex items-center gap-2 bg-muted rounded-md p-2 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {dom.domiciliarios.usuarios?.nombre}
                      </p>
                      <a
                        href={`tel:${dom.domiciliarios.usuarios?.telefono}`}
                        className="text-xs text-primary"
                      >
                        {dom.domiciliarios.usuarios?.telefono}
                      </a>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Solicitado:{' '}
                  {new Date(dom.creado_en).toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
