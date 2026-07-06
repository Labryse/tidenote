import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUp, ArrowDown, Check } from 'lucide-react'

type Status = 'idle' | 'available' | 'downloading' | 'downloaded'

export default function UpdateNotification() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>('idle')
  const [version, setVersion] = useState('')
  const [percent, setPercent] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [restarting, setRestarting] = useState(false)

  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api) return

    api.onUpdateAvailable?.((info: any) => {
      setVersion(info.version)
      setStatus('available')
      setDismissed(false)
    })
    api.onDownloadProgress?.((p: any) => {
      setPercent(p.percent)
      setStatus('downloading')
    })
    api.onUpdateDownloaded?.(() => {
      setStatus('downloaded')
    })
  }, [])

  const api = (window as any).electronAPI

  const handleRestart = () => {
    // Show the full-screen splash first so the user understands what's about to
    // happen; main.cjs delays quitAndInstall slightly so this can paint.
    setRestarting(true)
    api?.installUpdate?.()
  }

  // Full-screen splash shown while the app closes and the installer takes over
  if (restarting) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'var(--color-bg-app, var(--color-bg-card))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{
          maxWidth: '360px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)',
            animation: 'tidenoteSpin 0.8s linear infinite'
          }} />
          <div>
            <p style={{
              margin: '0 0 8px',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-text-primary)'
            }}>
              {t('update.restartingTitle')}
            </p>
            <p style={{
              margin: 0,
              fontSize: '13px',
              lineHeight: 1.5,
              color: 'var(--color-text-muted)'
            }}>
              {t('update.restartingDesc')}
            </p>
          </div>
        </div>

        <style>{`
          @keyframes tidenoteSpin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!api || dismissed || status === 'idle') return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      right: '24px',
      zIndex: 9999,
      width: '300px',
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)'
    }}>
      {/* Kapat */}
      <button
        onClick={() => setDismissed(true)}
        style={{
          position: 'absolute',
          top: '8px', right: '10px',
          background: 'none', border: 'none',
          color: 'var(--color-text-muted)',
          cursor: 'pointer', fontSize: '18px',
          lineHeight: 1, padding: '2px'
        }}>×</button>

      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '36px', height: '36px',
          background: 'var(--color-accent-soft)',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
          fontSize: '18px'
        }}>
          {status === 'downloaded'
            ? <Check size={18} style={{ flexShrink: 0 }} />
            : status === 'downloading'
            ? <ArrowDown size={18} style={{ flexShrink: 0 }} />
            : <ArrowUp size={18} style={{ flexShrink: 0 }} />}</div>
        <div>
          <p style={{
            margin: 0, fontSize: '13px', fontWeight: 600,
            color: 'var(--color-text-primary)'
          }}>
            {status === 'available' && t('update.availableTitle', { version })}
            {status === 'downloading' && t('update.downloadingTitle', { percent })}
            {status === 'downloaded' && t('update.readyTitle')}
          </p>
          <p style={{
            margin: 0, fontSize: '11px',
            color: 'var(--color-text-muted)'
          }}>
            {status === 'available' && t('update.availableDesc')}
            {status === 'downloading' && t('update.downloadingDesc')}
            {status === 'downloaded' && t('update.readyDesc')}
          </p>
        </div>
      </div>

      {/* Progress bar — sadece indirirken */}
      {status === 'downloading' && (
        <div style={{
          height: '4px', background: 'var(--color-border)',
          borderRadius: '2px', overflow: 'hidden'
        }}>
          <div style={{
            height: '100%', width: `${percent}%`,
            background: 'var(--color-accent)',
            borderRadius: '2px',
            transition: 'width 0.3s ease'
          }} />
        </div>
      )}

      {/* Butonlar */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {status === 'available' && (
          <button
            onClick={() => {
              api.startUpdateDownload()
              setStatus('downloading')
            }}
            style={{
              flex: 1, background: 'var(--color-accent)',
              color: 'white', border: 'none',
              borderRadius: '8px', padding: '8px',
              fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }}>
            {t('update.download')}
          </button>
        )}
        {status === 'downloaded' && (
          <>
            <button
              onClick={() => setDismissed(true)}
              style={{
                flex: 1, background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '8px', padding: '8px',
                fontSize: '12px', cursor: 'pointer',
                color: 'var(--color-text-muted)',
                fontFamily: 'inherit'
              }}>
              {t('update.later')}
            </button>
            <button
              onClick={handleRestart}
              style={{
                flex: 2, background: 'var(--color-accent)',
                color: 'white', border: 'none',
                borderRadius: '8px', padding: '8px',
                fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit'
              }}>
              {t('update.restart')}
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
