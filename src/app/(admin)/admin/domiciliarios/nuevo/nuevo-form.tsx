'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { crearDomiciliario } from '@/app/actions/crud'

export function NuevoDomiciliarioForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: '', email: '', telefono: '', cedula: '', password: '',
    placa: '', modelo_moto: '',
    tiene_tecnomecanica: false, tiene_soat: false, tiene_licencia: false,
  })

  function onChange(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await crearDomiciliario(form)
      toast.success('Domiciliario creado exitosamente')
      router.push('/admin/domiciliarios')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear domiciliario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre completo</Label>
        <Input id="nombre" value={form.nombre} onChange={(e) => onChange('nombre', e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input id="email" type="email" value={form.email} onChange={(e) => onChange('email', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input id="telefono" value={form.telefono} onChange={(e) => onChange('telefono', e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cedula">Cédula</Label>
          <Input id="cedula" value={form.cedula} onChange={(e) => onChange('cedula', e.target.value)} required />
        </div>
      </div>

      <Separator />
      <p className="text-sm font-medium">Datos del vehículo</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="placa">Placa</Label>
          <Input id="placa" placeholder="Ej: ABC-12D" value={form.placa} onChange={(e) => onChange('placa', e.target.value.toUpperCase())} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="modelo_moto">Modelo de moto</Label>
          <Input id="modelo_moto" placeholder="Ej: Yamaha FZ 2024" value={form.modelo_moto} onChange={(e) => onChange('modelo_moto', e.target.value)} />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="tiene_soat" className="cursor-pointer">Tiene SOAT vigente</Label>
          <Switch id="tiene_soat" checked={form.tiene_soat} onCheckedChange={(v) => onChange('tiene_soat', v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="tiene_tecnomecanica" className="cursor-pointer">Tiene Tecnomecánica vigente</Label>
          <Switch id="tiene_tecnomecanica" checked={form.tiene_tecnomecanica} onCheckedChange={(v) => onChange('tiene_tecnomecanica', v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="tiene_licencia" className="cursor-pointer">Tiene Licencia de conducir</Label>
          <Switch id="tiene_licencia" checked={form.tiene_licencia} onCheckedChange={(v) => onChange('tiene_licencia', v)} />
        </div>
      </div>

      <Separator />
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña inicial</Label>
        <Input id="password" type="password" value={form.password} onChange={(e) => onChange('password', e.target.value)} required minLength={6} />
        <p className="text-xs text-muted-foreground">Mínimo 6 caracteres. El usuario podrá cambiarla después.</p>
      </div>
      <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear domiciliario'}</Button>
    </form>
  )
}
