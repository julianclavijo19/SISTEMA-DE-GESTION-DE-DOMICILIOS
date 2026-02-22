'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/lib/icons'

type EstadoDomicilio =
  | 'PENDIENTE'
  | 'NOTIFICADO'
  | 'ASIGNADO'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'CANCELADO'

interface DomicilioHistorial {
  id: string
  nombre_cliente: string
  direccion_entrega: string
  valor_pedido: number
  comision_empresa: number
  estado: EstadoDomicilio
  creado_en: string
  restaurantes?: {
    usuarios: {
      nombre: string
    }
  }
}

const ESTADO_COLOR: Record<EstadoDomicilio, string> = {
  PENDIENTE: 'bg-yellow-500 text-white',
  NOTIFICADO: 'bg-blue-500 text-white',
  ASIGNADO: 'bg-indigo-500 text-white',
  EN_CAMINO: 'bg-purple-500 text-white',
  ENTREGADO: 'bg-green-500 text-white',
  CANCELADO: 'bg-red-500 text-white',
}

export default function DomiciliarioHistorialPage() {
  const supabase = createSupabaseBrowser()
  const [domicilios, setDomicilios] = useState<DomicilioHistorial[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ entregados: 0, totalValor: 0 })

  const cargarHistorial = useCallback(async () => {
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

    const { data: dom } = await supabase
      .from('domiciliarios')
      .select('id')
      .eq('usuario_id', usuario.id)
      .single()

    if (!dom) return

    const { data } = await supabase
      .from('domicilios')
      .select(`
        id, nombre_cliente, direccion_entrega,
        valor_pedido, comision_empresa, estado, creado_en,
        restaurantes (usuarios(nombre))
      `)
      .eq('domiciliario_id', dom.id)
      .in('estado', ['ENTREGADO', 'CANCELADO'])
      .order('creado_en', { ascending: false })
      .limit(50)

    const items = ((data as unknown as DomicilioHistorial[]) || [])
    setDomicilios(items)

    const entregados = items.filter((d) => d.estado === 'ENTREGADO')
    setStats({
      entregados: entregados.length,
      totalValor: entregados.reduce((acc, d) => acc + d.valor_pedido, 0),
    })
  }, [supabase])

  useEffect(() => {
    cargarHistorial().then(() => setLoading(false))
  }, [cargarHistorial])

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
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Mi historial</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{stats.entregados}</p>
            <p className="text-xs text-muted-foreground">Entregas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{formatCurrency(stats.totalValor)}</p>
            <p className="text-xs text-muted-foreground">Total movido</p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      {domicilios.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Aún no tienes entregas</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {domicilios.map((dom) => (
            <Card key={dom.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {dom.restaurantes?.usuarios?.nombre}
                  </CardTitle>
                  <Badge className={ESTADO_COLOR[dom.estado]} >
                    {dom.estado === 'ENTREGADO' ? 'Entregado' : 'Cancelado'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>{dom.nombre_cliente} — {dom.direccion_entrega}</p>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(dom.creado_en).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(dom.valor_pedido)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
