import { requireRole } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from '@/lib/icons'
import { NuevoDomiciliarioForm } from './nuevo-form'

export default async function NuevoDomiciliarioPage() {
  await requireRole(['ADMIN'])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/domiciliarios"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Nuevo Domiciliario</h1>
      </div>
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Datos del domiciliario</CardTitle></CardHeader>
        <CardContent><NuevoDomiciliarioForm /></CardContent>
      </Card>
    </div>
  )
}
