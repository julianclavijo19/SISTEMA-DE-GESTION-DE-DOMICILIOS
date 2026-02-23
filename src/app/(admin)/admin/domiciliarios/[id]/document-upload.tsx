'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Upload, FileArrowUp, Calendar } from '@/lib/icons'
import { subirDocumentoDomiciliario, actualizarFechaDocumento } from './actions'

interface Documento {
  campo: string
  label: string
  url: string | null
  campoFecha?: string
  fecha?: string | null
}

interface Props {
  domiciliarioId: string
  documentos: Documento[]
}

export function DocumentUpload({ domiciliarioId, documentos }: Props) {
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function handleUpload(campo: string) {
    const input = fileRefs.current[campo]
    if (!input?.files?.[0]) { toast.error('Selecciona un archivo'); return }

    const file = input.files[0]
    if (file.size > 5 * 1024 * 1024) { toast.error('El archivo no debe superar 5MB'); return }

    setUploading(campo)
    try {
      const formData = new FormData()
      formData.append('domiciliarioId', domiciliarioId)
      formData.append('tipoDocumento', campo)
      formData.append('archivo', file)
      await subirDocumentoDomiciliario(formData)
      toast.success(`${campo} subido correctamente`)
      input.value = ''
    } catch (err) {
      toast.error('Error al subir el documento')
    } finally {
      setUploading(null)
    }
  }

  async function handleFechaChange(campoFecha: string, valor: string) {
    if (!valor) return
    try {
      await actualizarFechaDocumento({
        domiciliarioId,
        campo: campoFecha,
        fecha: valor,
      })
      toast.success('Fecha actualizada')
    } catch {
      toast.error('Error actualizando fecha')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" /> Documentos del domiciliario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {documentos.map((doc) => (
          <div key={doc.campo} className="space-y-2 p-3 rounded-lg border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{doc.label}</span>
              {doc.url ? (
                <Badge variant="default" className="gap-1"><FileArrowUp className="h-3 w-3" />Cargado</Badge>
              ) : (
                <Badge variant="secondary">Pendiente</Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                ref={(el) => { fileRefs.current[doc.campo] = el }}
                className="text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpload(doc.campo)}
                disabled={uploading === doc.campo}
              >
                {uploading === doc.campo ? 'Subiendo...' : 'Subir'}
              </Button>
            </div>

            {doc.url && (
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                Ver documento actual
              </a>
            )}

            {doc.campoFecha && (
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <Label className="text-xs">Vencimiento:</Label>
                <Input
                  type="date"
                  className="h-8 text-xs w-40"
                  defaultValue={doc.fecha ? new Date(doc.fecha).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleFechaChange(doc.campoFecha!, e.target.value)}
                />
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
