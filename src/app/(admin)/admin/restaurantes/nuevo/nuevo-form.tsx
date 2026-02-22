'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { crearRestaurante } from '@/app/actions/crud'

export function NuevoRestauranteForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: '', email: '', telefono: '', password: '',
    nit: '', direccion: '', horario: '',
  })

  function onChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await crearRestaurante(form)
      toast.success('Restaurante creado exitosamente')
      router.push('/admin/restaurantes')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear restaurante')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre del negocio</Label>
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
          <Label htmlFor="nit">NIT (opcional)</Label>
          <Input id="nit" value={form.nit} onChange={(e) => onChange('nit', e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Input id="direccion" value={form.direccion} onChange={(e) => onChange('direccion', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="horario">Horario (ej: 10:00 - 22:00)</Label>
        <Input id="horario" value={form.horario} onChange={(e) => onChange('horario', e.target.value)} />
      </div>
      <Separator />
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña inicial</Label>
        <Input id="password" type="password" value={form.password} onChange={(e) => onChange('password', e.target.value)} required minLength={6} />
        <p className="text-xs text-muted-foreground">Mínimo 6 caracteres. El restaurante podrá cambiarla después.</p>
      </div>
      <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear restaurante'}</Button>
    </form>
  )
}
