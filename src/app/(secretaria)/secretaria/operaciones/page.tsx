'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Clock,
  MapPin,
  Phone,
  User,
  Bicycle,
  ArrowsClockwise,
  CheckCircle,
  XCircle,
  ArrowRight,
  Storefront,
  Plus,
  PaperPlaneTilt,
} from '@/lib/icons'
import {
  asignarDomiciliarioAction,
  reasignarDomiciliarioAction,
  cancelarDomicilioAction,
  crearDomicilioSecretariaAction,
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
  restaurante_id: string
  domiciliario_id: string | null
  creado_por_id: string | null
  nombre_cliente: string
  telefono_cliente: string
  direccion_entrega: string
  referencia_direccion: string | null
  observaciones: string | null
  valor_pedido: number
  porcentaje_comision: number
  comision_empresa: number
  estado: EstadoDomicilio
  motivo_cancelacion: string | null
  creado_en: string
  actualizado_en: string
  restaurantes?: {
    direccion: string
    usuarios: {
      nombre: string
      telefono: string
    }
  }
  domiciliarios?: {
    cedula: string
    disponible: boolean
    usuarios: {
      nombre: string
      telefono: string
    }
  }
}

interface Domiciliario {
  id: string
  cedula: string
  disponible: boolean
  usuarios: {
    nombre: string
    telefono: string
    estado: string
  }
}

interface Restaurante {
  id: string
  direccion: string | null
  usuarios: {
    nombre: string
    telefono: string
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

const ESTADO_LABEL: Record<EstadoDomicilio, string> = {
  PENDIENTE: 'Pendiente',
  NOTIFICADO: 'Notificado',
  ASIGNADO: 'Asignado',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
}

export default function OperacionesPage() {
  const supabase = createSupabaseBrowser()

  const [domicilios, setDomicilios] = useState<Domicilio[]>([])
  const [domiciliarios, setDomiciliarios] = useState<Domiciliario[]>([])
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([])
  const [loading, setLoading] = useState(true)
  const [tabActual, setTabActual] = useState('activos')

  // Dialog states
  const [asignarDialog, setAsignarDialog] = useState<{
    open: boolean
    domicilio: Domicilio | null
  }>({ open: false, domicilio: null })
  const [domiciliarioSeleccionado, setDomiciliarioSeleccionado] = useState('')

  const [cancelarDialog, setCancelarDialog] = useState<{
    open: boolean
    domicilioId: string | null
  }>({ open: false, domicilioId: null })
  const [motivoCancelacion, setMotivoCancelacion] = useState('')

  // Crear pedido dialog
  const [crearDialog, setCrearDialog] = useState(false)
  const [crearLoading, setCrearLoading] = useState(false)
  const [crearForm, setCrearForm] = useState({
    restaurante_id: '',
    nombre_cliente: '',
    telefono_cliente: '',
    direccion_entrega: '',
    referencia_direccion: '',
    observaciones: '',
    valor_pedido: '',
  })

  const cargarDomicilios = useCallback(async () => {
    const { data, error } = await supabase
      .from('domicilios')
      .select(`
        *,
        restaurantes (direccion, usuarios(nombre, telefono)),
        domiciliarios (cedula, disponible, usuarios(nombre, telefono))
      `)
      .order('creado_en', { ascending: false })

    if (error) {
      toast.error('Error cargando domicilios: ' + error.message)
      return
    }
    setDomicilios((data as unknown as Domicilio[]) || [])
  }, [supabase])

  const cargarDomiciliarios = useCallback(async () => {
    const { data, error } = await supabase
      .from('domiciliarios')
      .select('id, cedula, disponible, usuarios!inner(nombre, telefono, estado)')
      .eq('usuarios.estado', 'ACTIVO')
      .order('disponible', { ascending: false })

    if (error) {
      toast.error('Error cargando domiciliarios: ' + error.message)
      return
    }
    setDomiciliarios((data as unknown as Domiciliario[]) || [])
  }, [supabase])

  const cargarRestaurantes = useCallback(async () => {
    const { data, error } = await supabase
      .from('restaurantes')
      .select('id, direccion, usuarios!inner(nombre, telefono)')

    if (error) {
      toast.error('Error cargando restaurantes')
      return
    }
    setRestaurantes((data as unknown as Restaurante[]) || [])
  }, [supabase])

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([cargarDomicilios(), cargarDomiciliarios(), cargarRestaurantes()])
      setLoading(false)
    }
    init()
  }, [cargarDomicilios, cargarDomiciliarios, cargarRestaurantes])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('operaciones-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'domicilios' },
        () => {
          cargarDomicilios()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'domiciliarios' },
        () => {
          cargarDomiciliarios()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, cargarDomicilios, cargarDomiciliarios])

  // Actions — now using server actions
  async function asignarDomiciliario() {
    if (!asignarDialog.domicilio || !domiciliarioSeleccionado) return

    try {
      await asignarDomiciliarioAction(asignarDialog.domicilio.id, domiciliarioSeleccionado)
      toast.success('Domiciliario asignado correctamente')
      setAsignarDialog({ open: false, domicilio: null })
      setDomiciliarioSeleccionado('')
      cargarDomicilios()
      cargarDomiciliarios()
    } catch (err: any) {
      toast.error(err.message || 'Error asignando domiciliario')
    }
  }

  async function reasignarDomiciliario() {
    if (!asignarDialog.domicilio || !domiciliarioSeleccionado) return

    try {
      await reasignarDomiciliarioAction(
        asignarDialog.domicilio.id,
        domiciliarioSeleccionado,
        asignarDialog.domicilio.domiciliario_id
      )
      toast.success('Domiciliario reasignado correctamente')
      setAsignarDialog({ open: false, domicilio: null })
      setDomiciliarioSeleccionado('')
      cargarDomicilios()
      cargarDomiciliarios()
    } catch (err: any) {
      toast.error(err.message || 'Error reasignando')
    }
  }

  async function cancelarDomicilio() {
    if (!cancelarDialog.domicilioId || !motivoCancelacion.trim()) {
      toast.error('Debe indicar un motivo de cancelación')
      return
    }

    try {
      await cancelarDomicilioAction(cancelarDialog.domicilioId, motivoCancelacion.trim())
      toast.success('Domicilio cancelado')
      setCancelarDialog({ open: false, domicilioId: null })
      setMotivoCancelacion('')
      cargarDomicilios()
      cargarDomiciliarios()
    } catch (err: any) {
      toast.error(err.message || 'Error cancelando domicilio')
    }
  }

  async function crearPedido(e: React.FormEvent) {
    e.preventDefault()

    if (!crearForm.restaurante_id) { toast.error('Seleccione un restaurante'); return }
    if (!crearForm.nombre_cliente.trim()) { toast.error('Nombre del cliente requerido'); return }
    if (!crearForm.telefono_cliente.trim()) { toast.error('Teléfono del cliente requerido'); return }
    if (!crearForm.direccion_entrega.trim()) { toast.error('Dirección de entrega requerida'); return }
    if (!crearForm.valor_pedido || Number(crearForm.valor_pedido) <= 0) { toast.error('El valor debe ser mayor a 0'); return }

    setCrearLoading(true)
    try {
      await crearDomicilioSecretariaAction({
        restaurante_id: crearForm.restaurante_id,
        nombre_cliente: crearForm.nombre_cliente.trim(),
        telefono_cliente: crearForm.telefono_cliente.trim(),
        direccion_entrega: crearForm.direccion_entrega.trim(),
        referencia_direccion: crearForm.referencia_direccion.trim() || undefined,
        observaciones: crearForm.observaciones.trim() || undefined,
        valor_pedido: Number(crearForm.valor_pedido),
      })
      toast.success('Pedido creado exitosamente')
      setCrearDialog(false)
      setCrearForm({
        restaurante_id: '',
        nombre_cliente: '',
        telefono_cliente: '',
        direccion_entrega: '',
        referencia_direccion: '',
        observaciones: '',
        valor_pedido: '',
      })
      cargarDomicilios()
    } catch (err: any) {
      toast.error(err.message || 'Error creando pedido')
    } finally {
      setCrearLoading(false)
    }
  }

  // Filtered lists
  const domiciliosActivos = domicilios.filter(
    (d) => !['ENTREGADO', 'CANCELADO'].includes(d.estado)
  )
  const domiciliosFinalizados = domicilios.filter((d) =>
    ['ENTREGADO', 'CANCELADO'].includes(d.estado)
  )

  const domiciliariosDisponibles = domiciliarios.filter((d) => d.disponible)

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    })
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
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Centro de Operaciones</h1>
          <p className="text-muted-foreground">
            {domiciliosActivos.length} activos &middot;{' '}
            {domiciliariosDisponibles.length} domiciliarios disponibles
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              cargarDomicilios()
              cargarDomiciliarios()
            }}
          >
            <ArrowsClockwise className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => setCrearDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear pedido
          </Button>
        </div>
      </div>

      {/* Domiciliarios bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bicycle className="h-4 w-4" />
            Domiciliarios ({domiciliarios.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {domiciliarios.map((d) => (
              <Badge
                key={d.id}
                variant={d.disponible ? 'default' : 'secondary'}
                className="gap-1"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    d.disponible ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />
                {d.usuarios?.nombre}
              </Badge>
            ))}
            {domiciliarios.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay domiciliarios activos
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tabActual} onValueChange={setTabActual}>
        <TabsList>
          <TabsTrigger value="activos" className="gap-1">
            Activos
            <Badge variant="secondary" className="ml-1">
              {domiciliosActivos.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="finalizados" className="gap-1">
            Finalizados
            <Badge variant="secondary" className="ml-1">
              {domiciliosFinalizados.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activos" className="mt-4">
          {domiciliosActivos.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                No hay domicilios activos en este momento
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {domiciliosActivos.map((dom) => (
                <DomicilioCard
                  key={dom.id}
                  domicilio={dom}
                  onAsignar={() =>
                    setAsignarDialog({ open: true, domicilio: dom })
                  }
                  onCancelar={() =>
                    setCancelarDialog({ open: true, domicilioId: dom.id })
                  }
                  formatTime={formatTime}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="finalizados" className="mt-4">
          {domiciliosFinalizados.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                No hay domicilios finalizados hoy
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {domiciliosFinalizados.map((dom) => (
                <DomicilioCard
                  key={dom.id}
                  domicilio={dom}
                  onAsignar={() => {}}
                  onCancelar={() => {}}
                  formatTime={formatTime}
                  formatCurrency={formatCurrency}
                  readonly
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Assign Dialog */}
      <Dialog
        open={asignarDialog.open}
        onOpenChange={(open) => {
          if (!open) setAsignarDialog({ open: false, domicilio: null })
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {asignarDialog.domicilio?.domiciliario_id
                ? 'Reasignar domiciliario'
                : 'Asignar domiciliario'}
            </DialogTitle>
            <DialogDescription>
              Pedido de {asignarDialog.domicilio?.restaurantes?.usuarios?.nombre} →{' '}
              {asignarDialog.domicilio?.nombre_cliente}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Seleccionar domiciliario
              </label>
              <Select
                value={domiciliarioSeleccionado}
                onValueChange={setDomiciliarioSeleccionado}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegir domiciliario" />
                </SelectTrigger>
                <SelectContent>
                  {domiciliariosDisponibles.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.usuarios?.nombre} — {d.usuarios?.telefono}
                    </SelectItem>
                  ))}
                  {domiciliariosDisponibles.length === 0 && (
                    <SelectItem value="_none" disabled>
                      No hay domiciliarios disponibles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAsignarDialog({ open: false, domicilio: null })}
            >
              Cancelar
            </Button>
            <Button
              onClick={
                asignarDialog.domicilio?.domiciliario_id
                  ? reasignarDomiciliario
                  : asignarDomiciliario
              }
              disabled={!domiciliarioSeleccionado}
            >
              {asignarDialog.domicilio?.domiciliario_id
                ? 'Reasignar'
                : 'Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <AlertDialog
        open={cancelarDialog.open}
        onOpenChange={(open) => {
          if (!open) setCancelarDialog({ open: false, domicilioId: null })
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar este domicilio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El domicilio quedará marcado como
              cancelado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2">
            <label className="text-sm font-medium mb-2 block">
              Motivo de cancelación *
            </label>
            <Textarea
              placeholder="Escriba el motivo..."
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() =>
                setCancelarDialog({ open: false, domicilioId: null })
              }
            >
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={cancelarDomicilio}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CREATE ORDER Dialog */}
      <Dialog open={crearDialog} onOpenChange={setCrearDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PaperPlaneTilt className="h-5 w-5" />
              Crear nuevo pedido
            </DialogTitle>
            <DialogDescription>
              Registre un pedido desde secretaría. Seleccione el restaurante y complete los datos del cliente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={crearPedido} className="space-y-4">
            <div className="space-y-2">
              <Label>Restaurante *</Label>
              <Select
                value={crearForm.restaurante_id}
                onValueChange={(v) => setCrearForm(prev => ({ ...prev, restaurante_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar restaurante" />
                </SelectTrigger>
                <SelectContent>
                  {restaurantes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.usuarios?.nombre} {r.direccion ? `— ${r.direccion}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nombre del cliente *</Label>
                <Input
                  value={crearForm.nombre_cliente}
                  onChange={(e) => setCrearForm(prev => ({ ...prev, nombre_cliente: e.target.value }))}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono *</Label>
                <Input
                  value={crearForm.telefono_cliente}
                  onChange={(e) => setCrearForm(prev => ({ ...prev, telefono_cliente: e.target.value }))}
                  placeholder="3001234567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dirección de entrega *</Label>
              <Input
                value={crearForm.direccion_entrega}
                onChange={(e) => setCrearForm(prev => ({ ...prev, direccion_entrega: e.target.value }))}
                placeholder="Calle 10 #5-23, Barrio Centro"
              />
            </div>

            <div className="space-y-2">
              <Label>Referencia / punto de encuentro</Label>
              <Input
                value={crearForm.referencia_direccion}
                onChange={(e) => setCrearForm(prev => ({ ...prev, referencia_direccion: e.target.value }))}
                placeholder="Casa esquinera azul, al lado de la tienda"
              />
            </div>

            <div className="space-y-2">
              <Label>Detalle del pedido</Label>
              <Textarea
                value={crearForm.observaciones}
                onChange={(e) => setCrearForm(prev => ({ ...prev, observaciones: e.target.value }))}
                placeholder="2x Hamburguesa especial, 1x Gaseosa..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor del pedido (COP) *</Label>
              <Input
                type="number"
                value={crearForm.valor_pedido}
                onChange={(e) => setCrearForm(prev => ({ ...prev, valor_pedido: e.target.value }))}
                placeholder="25000"
                min={0}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCrearDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={crearLoading}>
                <PaperPlaneTilt className="h-4 w-4 mr-2" />
                {crearLoading ? 'Creando...' : 'Crear pedido'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ============ Domicilio Card ============ */

function DomicilioCard({
  domicilio,
  onAsignar,
  onCancelar,
  formatTime,
  formatCurrency,
  readonly = false,
}: {
  domicilio: Domicilio
  onAsignar: () => void
  onCancelar: () => void
  formatTime: (d: string) => string
  formatCurrency: (v: number) => string
  readonly?: boolean
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge className={ESTADO_COLOR[domicilio.estado]}>
            {ESTADO_LABEL[domicilio.estado]}
          </Badge>
          <div className="flex items-center gap-2">
            {domicilio.creado_por_id && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Secretaría
              </Badge>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(domicilio.creado_en)}
            </span>
          </div>
        </div>
        <CardTitle className="text-base mt-2">
          {domicilio.restaurantes?.usuarios?.nombre ?? 'Restaurante'}
          <ArrowRight className="inline h-3 w-3 mx-1" />
          {domicilio.nombre_cliente}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <Storefront className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <span>{domicilio.restaurantes?.direccion ?? '—'}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <span>{domicilio.direccion_entrega}</span>
        </div>
        {domicilio.referencia_direccion && (
          <div className="text-xs text-muted-foreground ml-6 italic">
            Ref: {domicilio.referencia_direccion}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>{domicilio.telefono_cliente}</span>
        </div>

        <Separator />

        {domicilio.observaciones && (
          <p className="text-muted-foreground line-clamp-2">
            {domicilio.observaciones}
          </p>
        )}

        <div className="flex justify-between font-medium">
          <span>Valor pedido:</span>
          <span>{formatCurrency(domicilio.valor_pedido)}</span>
        </div>

        {domicilio.domiciliarios && (
          <div className="flex items-center gap-2 bg-muted rounded-md p-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">
                {domicilio.domiciliarios.usuarios?.nombre}
              </p>
              <p className="text-xs text-muted-foreground">
                {domicilio.domiciliarios.usuarios?.telefono}
              </p>
            </div>
          </div>
        )}

        {domicilio.estado === 'CANCELADO' && domicilio.motivo_cancelacion && (
          <div className="bg-destructive/10 text-destructive rounded-md p-2 text-xs">
            <strong>Motivo:</strong> {domicilio.motivo_cancelacion}
          </div>
        )}
      </CardContent>

      {!readonly && (
        <CardFooter className="gap-2 pt-0">
          {domicilio.estado === 'PENDIENTE' && (
            <Button size="sm" className="flex-1" onClick={onAsignar}>
              <Bicycle className="h-4 w-4 mr-1" />
              Asignar
            </Button>
          )}
          {['ASIGNADO', 'EN_CAMINO'].includes(domicilio.estado) && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onAsignar}
            >
              <ArrowsClockwise className="h-4 w-4 mr-1" />
              Reasignar
            </Button>
          )}
          {!['ENTREGADO', 'CANCELADO'].includes(domicilio.estado) && (
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={onCancelar}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
