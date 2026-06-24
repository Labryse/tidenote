import { createReactBlockSpec } from '@blocknote/react'

const calloutTypes = {
  info:    { emoji: '💡', color: '#0891B2', bg: 'rgba(8,145,178,0.08)',    label: 'BİLGİ' },
  warning: { emoji: '⚠️', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  label: 'UYARI' },
  success: { emoji: '✅', color: '#10B981', bg: 'rgba(16,185,129,0.08)',   label: 'BAŞARI' },
  danger:  { emoji: '❌', color: '#EF4444', bg: 'rgba(239,68,68,0.08)',    label: 'HATA' },
  tip:     { emoji: '🔥', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)',   label: 'İPUCU' },
} as const

export const CalloutBlock = createReactBlockSpec(
  {
    type: 'callout',
    propSchema: {
      type: { default: 'info' },
    },
    content: 'inline',
  },
  {
    render: ({ block, contentRef }) => {
      const t = calloutTypes[
        block.props.type as keyof typeof calloutTypes
      ] ?? calloutTypes.info
      return (
        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
          background: t.bg,
          borderLeft: `4px solid ${t.color}`,
          borderRadius: '8px',
          padding: '12px 16px',
          margin: '4px 0',
        }}>
          <span style={{ fontSize: '16px', lineHeight: 1.5 }}>
            {t.emoji}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 700,
              color: t.color,
              letterSpacing: '0.08em',
              marginBottom: '4px',
            }}>
              {t.label}
            </div>
            <div ref={contentRef} />
          </div>
        </div>
      )
    },
  }
)
