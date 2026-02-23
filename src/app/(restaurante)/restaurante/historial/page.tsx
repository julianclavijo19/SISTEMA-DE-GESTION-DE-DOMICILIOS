'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, MapPin, MagnifyingGlass, User } from '@/lib/icons'

type EstadoDomicilio =
  | 'PENDIENTE'
  | 'NOTIFICADO'
  | 'ASIGNADO'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'CANCELADO'

interface DomicilioHist {
  id: string
  nombre_cliente: string
  direccion_entrega: string
  observaciones: string | null
  valor_pedido: number
  comision_empresa: number
  estado: EstadoDomicilio
  motivo_cancelacion: string | null
  creado_en: string
  domiciliarios?: {
    usuarios: {
      nombre: string
    }
  }
}

const ESTADO_COLOR: Record<EstadoDomicilio, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  NOTIFICADO: 'bg-sky-100 text-sky-800 border border-sky-200',
  ASIGNADO: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  EN_CAMINO: 'bg-purple-100 text-purple-800 border border-purple-200',
  ENTREGADO: 'bg-green-100 text-green-800 border border-green-200',
  CANCELADO: 'bg-red-100 text-red-800 border border-red-200',
}

export default function RestauranteHistorialPage() {
  const supabase = createSupabaseBrowser()
  const [domicilios, setDomicilios] = useState<DomicilioHist[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS')

  const cargar = useCallback(async () => {
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

    if (!rest) return

    const { data } = await supabase
      .from('domicilios')
      .select(`
        id, nombre_cliente, direccion_entrega, observaciones,
        valor_pedido, comision_empresa, estado, motivo_cancelacion,
        creado_en,
        domiciliarios (usuarios(nombre))
      `)
      .eq('restaurante_id', rest.id)
      .order('creado_en', { ascending: false })
      .limit(100)

    setDomicilios((data as unknown as DomicilioHist[]) || [])
  }, [supabase])

  useEffect(() => {
    cargar().then(() => setLoading(false))
  }, [cargar])

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const filtrados = domicilios.filter((d) => {
    const matchEstado =
      filtroEstado === 'TODOS' || d.estado === filtroEstado
    const matchBusqueda =
      !busqueda ||
      d.nombre_cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
      d.direccion_entrega.toLowerCase().includes(busqueda.toLowerCase())
    return matchEstado && matchBusqueda
  })

  const totales = {
    entregados: domicilios.filter((d) => d.estado === 'ENTREGADO').length,
    cancelados: domicilios.filter((d) => d.estado === 'CANCELADO').length,
    valorTotal: domicilios
      .filter((d) => d.estado === 'ENTREGADO')
      .reduce((s, d) => s + d.valor_pedido, 0),
    comisionTotal: domicilios
      .filter((d) => d.estado === 'ENTREGADO')
      .reduce((s, d) => s + d.comision_empresa, 0),
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Historial de domicilios</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{totales.entregados}</p>
            <p className="text-xs text-muted-foreground">Entregados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{totales.cancelados}</p>
            <p className="text-xs text-muted-foreground">Cancelados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totales.valorTotal)}
            </p>
            <p className="text-xs text-muted-foreground">Total vendido</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(totales.comisionTotal)}
            </p>
            <p className="text-xs text-muted-foreground">Comisión empresa</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente o dirección..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="ENTREGADO">Entregados</SelectItem>
            <SelectItem value="CANCELADO">Cancelados</SelectItem>
            <SelectItem value="PENDIENTE">Pendientes</SelectItem>
            <SelectItem value="EN_CAMINO">En camino</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtrados.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No se encontraron resultados</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtrados.map((dom) => (
            <Card key={dom.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{dom.nombre_cliente}</CardTitle>
                  <Badge className={ESTADO_COLOR[dom.estado]}>
                    {dom.estado === 'EN_CAMINO'
                      ? 'En camino'
                      : dom.estado.charAt(0) + dom.estado.slice(1).toLowerCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {dom.direccion_entrega}
                </div>

                {dom.domiciliarios && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <User className="h-3 w-3" />
                    {dom.domiciliarios.usuarios?.nombre}
                  </div>
                )}

                <p className="line-clamp-1 text-muted-foreground">
                  {dom.observaciones}
                </p>

                {dom.motivo_cancelacion && (
                  <p className="text-xs text-destructive">
                    Motivo: {dom.motivo_cancelacion}
                  </p>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(dom.creado_en).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(dom.valor_pedido)}
                    </p>
                    {dom.comision_empresa > 0 && (
                      <p className="text-xs text-orange-600">
                        Comisión: {formatCurrency(dom.comision_empresa)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
