'use client'

type EstadoDomicilio =
  | 'PENDIENTE'
  | 'NOTIFICADO'
  | 'ASIGNADO'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'CANCELADO'

const estadoConfig: Record<
  EstadoDomicilio,
  { label: string; bg: string; text: string; dot: string; border: string; pulse?: boolean }
> = {
  PENDIENTE: {
    label: 'Pendiente',
    bg: '#FFFBEB',
    text: '#B45309',
    dot: '#D97706',
    border: '#FDE68A',
    pulse: true,
  },
  NOTIFICADO: {
    label: 'Notificado',
    bg: '#EFF6FF',
    text: '#1D4ED8',
    dot: '#2563EB',
    border: '#BFDBFE',
    pulse: true,
  },
  ASIGNADO: {
    label: 'Asignado',
    bg: '#EEF2FF',
    text: '#4338CA',
    dot: '#6366F1',
    border: '#C7D2FE',
  },
  EN_CAMINO: {
    label: 'En camino',
    bg: '#F5F3FF',
    text: '#6D28D9',
    dot: '#7C3AED',
    border: '#DDD6FE',
    pulse: true,
  },
  ENTREGADO: {
    label: 'Entregado',
    bg: '#ECFDF5',
    text: '#047857',
    dot: '#059669',
    border: '#A7F3D0',
  },
  CANCELADO: {
    label: 'Cancelado',
    bg: '#FEF2F2',
    text: '#B91C1C',
    dot: '#DC2626',
    border: '#FECACA',
  },
}

interface EstadoBadgeProps {
  estado: string
  className?: string
}

export function EstadoBadge({ estado, className = '' }: EstadoBadgeProps) {
  const config = estadoConfig[estado as EstadoDomicilio] ?? {
    label: estado,
    bg: '#F1F5F9',
    text: '#475569',
    dot: '#94A3B8',
    border: '#E2E8F0',
  }

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        background: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: config.dot,
          flexShrink: 0,
          animation: config.pulse ? 'pulse-dot 2s ease-in-out infinite' : undefined,
        }}
      />
      {config.label}
    </span>
  )
}
