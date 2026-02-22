'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Warning, Plus, ArrowsClockwise } from '@/lib/icons'

interface Novedad {
  id: string
  domicilio_id: string
  reportado_por_id: string
  descripcion: string
  creado_en: string
  domicilios?: { nombre_cliente: string; direccion_entrega: string; estado: string }
  usuarios?: { nombre: string; rol: string }
}

interface DomicilioActivo {
  id: string
  nombre_cliente: string
  direccion_entrega: string
  estado: string
}

export default function SecretariaNovedadesPage() {
  const supabase = createSupabaseBrowser()
  const [novedades, setNovedades] = useState<Novedad[]>([])
  const [domiciliosActivos, setDomiciliosActivos] = useState<DomicilioActivo[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [domicilioId, setDomicilioId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const cargar = useCallback(async () => {
    const [novRes, domRes] = await Promise.all([
      supabase.from('novedades')
        .select('*, domicilios(nombre_cliente, direccion_entrega, estado), usuarios!novedades_reportado_por_id_fkey(nombre, rol)')
        .order('creado_en', { ascending: false }).limit(100),
      supabase.from('domicilios')
        .select('id, nombre_cliente, direccion_entrega, estado')
        .not('estado', 'in', '(ENTREGADO,CANCELADO)')
        .order('creado_en', { ascending: false }),
    ])
    if (novRes.data) setNovedades(novRes.data as unknown as Novedad[])
    if (domRes.data) setDomiciliosActivos(domRes.data as unknown as DomicilioActivo[])
  }, [supabase])

  useEffect(() => {
    async function init() { setLoading(true); await cargar(); setLoading(false) }
    init()
  }, [cargar])

  useEffect(() => {
    const channel = supabase.channel('novedades-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'novedades' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, cargar])

  async function crearNovedad() {
    if (!domicilioId || !descripcion.trim()) {
      toast.error('Selecciona un domicilio y describe la novedad')
      return
    }
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('No autenticado'); setSubmitting(false); return }
    const { data: usuario } = await supabase.from('usuarios').select('id').eq('auth_id', user.id).single()
    if (!usuario) { toast.error('Usuario no encontrado'); setSubmitting(false); return }

    const { error } = await supabase.from('novedades').insert({
      domicilio_id: domicilioId,
      reportado_por_id: usuario.id,
      descripcion: descripcion.trim(),
    })
    if (error) { toast.error('Error: ' + error.message); setSubmitting(false); return }
    toast.success('Novedad registrada')
    setDialogOpen(false); setDomicilioId(''); setDescripcion(''); setSubmitting(false)
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Novedades e Incidentes</h1>
          <p className="text-muted-foreground">{novedades.length} novedades registradas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargar}><ArrowsClockwise className="h-4 w-4 mr-2" />Actualizar</Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Reportar novedad</Button>
        </div>
      </div>

      {novedades.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No hay novedades registradas.</p></Card>
      ) : (
        <div className="space-y-3">
          {novedades.map((n) => (
            <Card key={n.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Warning className="h-4 w-4 text-yellow-500" />
                    <CardTitle className="text-sm font-medium">
                      {n.domicilios?.nombre_cliente ?? 'Cliente'}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{n.domicilios?.estado?.replace('_', ' ') ?? ''}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.creado_en).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>{n.descripcion}</p>
                <p className="text-muted-foreground">
                  Reportado por: <span className="font-medium">{n.usuarios?.nombre ?? '—'}</span> ({n.usuarios?.rol ?? ''})
                </p>
                <p className="text-muted-foreground">Dirección: {n.domicilios?.direccion_entrega ?? ''}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reportar novedad</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Domicilio activo</label>
              <Select value={domicilioId} onValueChange={setDomicilioId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar domicilio" /></SelectTrigger>
                <SelectContent>
                  {domiciliosActivos.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nombre_cliente} — {d.direccion_entrega}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Descripción de la novedad *</label>
              <Textarea placeholder="Describa lo ocurrido..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={crearNovedad} disabled={submitting || !domicilioId || !descripcion.trim()}>
              {submitting ? 'Enviando...' : 'Registrar novedad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
