'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  MapPin,
  Phone,
  Storefront,
  NavigationArrow,
  CheckCircle,
  Package,
  ArrowRight,
  Warning,
} from '@/lib/icons'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  aceptarPedidoAction,
  avanzarEstadoDomicilioAction,
  crearNovedadAction,
} from '@/app/actions/crud'

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
  referencia_direccion: string | null
  observaciones: string | null
  valor_pedido: number
  estado: EstadoDomicilio
  creado_en: string
  restaurantes?: {
    direccion: string
    usuarios: {
      nombre: string
      telefono: string
    }
  }
}

interface DomiciliarioProfile {
  id: string
  disponible: boolean
  usuario_nombre: string
}

export default function DomiciliarioInicioPage() {
  const supabase = createSupabaseBrowser()

  const [perfil, setPerfil] = useState<DomiciliarioProfile | null>(null)
  const [domicilioActivo, setDomicilioActivo] = useState<Domicilio | null>(null)
  const [domiciliosPendientes, setDomiciliosPendientes] = useState<Domicilio[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [novedadDialog, setNovedadDialog] = useState(false)
  const [novedadTexto, setNovedadTexto] = useState('')
  const [novedadLoading, setNovedadLoading] = useState(false)

  const cargarPerfil = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Get usuario record
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!usuario) return

    const { data: dom } = await supabase
      .from('domiciliarios')
      .select('id, disponible, usuarios(nombre)')
      .eq('usuario_id', usuario.id)
      .single()

    if (dom) {
      setPerfil({
        id: (dom as any).id,
        disponible: (dom as any).disponible,
        usuario_nombre: (dom as any).usuarios?.nombre ?? '',
      })
    }
    return dom
  }, [supabase])

  const cargarDomicilios = useCallback(
    async (domiciliarioId: string) => {
      // Active delivery (assigned to me, not finished)
      const { data: activo } = await supabase
        .from('domicilios')
        .select(`
          *,
          restaurantes (direccion, usuarios(nombre, telefono))
        `)
        .eq('domiciliario_id', domiciliarioId)
        .not('estado', 'in', '("ENTREGADO","CANCELADO")')
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle()

      setDomicilioActivo(activo as unknown as Domicilio | null)

      // Pending orders (no domiciliario, I could accept)
      const { data: pendientes } = await supabase
        .from('domicilios')
        .select(`
          *,
          restaurantes (direccion, usuarios(nombre, telefono))
        `)
        .eq('estado', 'PENDIENTE')
        .is('domiciliario_id', null)
        .order('creado_en', { ascending: true })

      setDomiciliosPendientes((pendientes as unknown as Domicilio[]) || [])
    },
    [supabase]
  )

  useEffect(() => {
    async function init() {
      setLoading(true)
      const dom = await cargarPerfil()
      if (dom) await cargarDomicilios(dom.id)
      setLoading(false)
    }
    init()
  }, [cargarPerfil, cargarDomicilios])

  // Realtime
  useEffect(() => {
    if (!perfil) return

    const channel = supabase
      .channel('domiciliario-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'domicilios' },
        () => {
          cargarDomicilios(perfil.id)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'domiciliarios' },
        () => {
          cargarPerfil()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, perfil, cargarDomicilios, cargarPerfil])

  // Toggle availability
  async function toggleDisponible() {
    if (!perfil) return
    const newValue = !perfil.disponible

    const { error } = await supabase
      .from('domiciliarios')
      .update({ disponible: newValue })
      .eq('id', perfil.id)

    if (error) {
      toast.error('Error cambiando disponibilidad')
      return
    }

    setPerfil({ ...perfil, disponible: newValue })
    toast.success(newValue ? 'Estás disponible' : 'No disponible')
  }

  // Accept an order — using server action (bypasses RLS issues)
  async function aceptarPedido(domicilioId: string) {
    if (!perfil) return
    setActionLoading(true)
    try {
      await aceptarPedidoAction(domicilioId)
      setPerfil((p) => (p ? { ...p, disponible: false } : p))
      toast.success('¡Pedido aceptado!')
      cargarDomicilios(perfil.id)
    } catch (err: any) {
      toast.error(err.message || 'No se pudo aceptar el pedido')
    } finally {
      setActionLoading(false)
    }
  }

  // Advance state — using server action (records historial, computes comision, sets entregado_en)
  async function avanzarEstado() {
    if (!domicilioActivo || !perfil) return
    setActionLoading(true)

    const siguiente = domicilioActivo.estado === 'ASIGNADO' ? 'EN_CAMINO' : 'ENTREGADO'

    try {
      await avanzarEstadoDomicilioAction(domicilioActivo.id)

      if (siguiente === 'ENTREGADO') {
        setPerfil((p) => (p ? { ...p, disponible: true } : p))
        toast.success('¡Entrega completada! 🎉')
      } else {
        toast.success('Estado actualizado: En camino')
      }
      cargarDomicilios(perfil.id)
    } catch (err: any) {
      toast.error(err.message || 'Error actualizando estado')
    } finally {
      setActionLoading(false)
    }
  }

  // Report novedad — using server action
  async function reportarNovedad() {
    if (!novedadTexto.trim() || !domicilioActivo) return
    setNovedadLoading(true)
    try {
      await crearNovedadAction(domicilioActivo.id, novedadTexto.trim())
      toast.success('Novedad reportada')
      setNovedadDialog(false)
      setNovedadTexto('')
    } catch (err: any) {
      toast.error(err.message || 'Error al reportar novedad')
    } finally {
      setNovedadLoading(false)
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value)
  }

  function openGoogleMaps(address: string) {
    const encoded = encodeURIComponent(address + ', Ocaña, Norte de Santander')
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank')
  }

  const ESTADO_BTN_LABEL: Record<string, string> = {
    ASIGNADO: '🚀 Estoy en camino',
    EN_CAMINO: '✅ Marcar como entregado',
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!perfil) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No se encontró el perfil de domiciliario
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Availability toggle */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="font-semibold">{perfil.usuario_nombre}</p>
            <p className="text-sm text-muted-foreground">
              {perfil.disponible ? '🟢 Disponible' : '🔴 No disponible'}
            </p>
          </div>
          <Switch
            checked={perfil.disponible}
            onCheckedChange={toggleDisponible}
          />
        </CardContent>
      </Card>

      {/* Active delivery */}
      {domicilioActivo && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <Badge className="w-fit bg-sky-100 text-sky-800 border border-sky-200">
              Pedido activo — {domicilioActivo.estado.replace('_', ' ')}
            </Badge>
            <CardTitle className="text-base mt-2">
              {domicilioActivo.restaurantes?.usuarios?.nombre}
              <ArrowRight className="inline h-3 w-3 mx-1" />
              {domicilioActivo.nombre_cliente}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            {/* Restaurant */}
            <div className="space-y-1">
              <p className="font-medium flex items-center gap-1">
                <Storefront className="h-4 w-4" /> Restaurante
              </p>
              <button
                className="flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                onClick={() =>
                  openGoogleMaps(domicilioActivo.restaurantes?.direccion ?? '')
                }
              >
                <NavigationArrow className="h-3 w-3" />
                {domicilioActivo.restaurantes?.direccion}
              </button>
              <a
                href={`tel:${domicilioActivo.restaurantes?.usuarios?.telefono}`}
                className="flex items-center gap-1 text-primary"
              >
                <Phone className="h-3 w-3" />
                {domicilioActivo.restaurantes?.usuarios?.telefono}
              </a>
            </div>

            <Separator />

            {/* Client */}
            <div className="space-y-1">
              <p className="font-medium flex items-center gap-1">
                <MapPin className="h-4 w-4" /> Entrega
              </p>
              <button
                className="flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                onClick={() =>
                  openGoogleMaps(domicilioActivo.direccion_entrega)
                }
              >
                <NavigationArrow className="h-3 w-3" />
                {domicilioActivo.direccion_entrega}
              </button>
              {domicilioActivo.referencia_direccion && (
                <p className="text-xs text-muted-foreground ml-4 italic">
                  Ref: {domicilioActivo.referencia_direccion}
                </p>
              )}
              <a
                href={`tel:${domicilioActivo.telefono_cliente}`}
                className="flex items-center gap-1 text-primary"
              >
                <Phone className="h-3 w-3" />
                {domicilioActivo.telefono_cliente}
              </a>
            </div>

            <Separator />

            {domicilioActivo.observaciones && (
              <p className="text-muted-foreground">{domicilioActivo.observaciones}</p>
            )}

            <div className="flex justify-between font-bold text-base">
              <span>Valor:</span>
              <span>{formatCurrency(domicilioActivo.valor_pedido)}</span>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            {ESTADO_BTN_LABEL[domicilioActivo.estado] && (
              <Button
                className="w-full h-14 text-lg"
                onClick={avanzarEstado}
                disabled={actionLoading}
              >
                {actionLoading ? 'Actualizando...' : ESTADO_BTN_LABEL[domicilioActivo.estado]}
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setNovedadDialog(true)}
            >
              <Warning className="h-4 w-4 mr-2" />
              Reportar novedad
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Pending orders (only if available and no active delivery) */}
      {perfil.disponible && !domicilioActivo && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pedidos disponibles ({domiciliosPendientes.length})
          </h2>

          {domiciliosPendientes.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                No hay pedidos pendientes en este momento
              </p>
            </Card>
          )}

          {domiciliosPendientes.map((dom) => (
            <Card key={dom.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {dom.restaurantes?.usuarios?.nombre}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {new Date(dom.creado_en).toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-center gap-1">
                  <Storefront className="h-3 w-3 text-muted-foreground" />
                  <span>{dom.restaurantes?.direccion}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span>{dom.direccion_entrega}</span>
                </div>
                {dom.referencia_direccion && (
                  <p className="text-xs text-muted-foreground ml-4 italic">
                    Ref: {dom.referencia_direccion}
                  </p>
                )}
                <p className="font-semibold text-right">
                  {formatCurrency(dom.valor_pedido)}
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => aceptarPedido(dom.id)}
                  disabled={actionLoading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {actionLoading ? 'Aceptando...' : 'Aceptar pedido'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Not available message */}
      {!perfil.disponible && !domicilioActivo && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-lg">
            Activa tu disponibilidad para recibir pedidos
          </p>
        </Card>
      )}

      {/* Novedad dialog */}
      <Dialog open={novedadDialog} onOpenChange={setNovedadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar novedad</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Describe la novedad o incidente..."
            value={novedadTexto}
            onChange={(e) => setNovedadTexto(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovedadDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={reportarNovedad}
              disabled={novedadLoading || !novedadTexto.trim()}
            >
              {novedadLoading ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
