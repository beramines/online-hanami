import { useCameraStore } from '../../stores/cameraStore'

export function CameraToggle() {
  const mode = useCameraStore((s) => s.mode)
  const toggleMode = useCameraStore((s) => s.toggleMode)

  return (
    <button
      onClick={toggleMode}
      style={styles.btn}
      title={mode === 'third' ? '一人称視点に切替' : '三人称視点に切替'}
    >
      {mode === 'third' ? '👁 三人称' : '👤 一人称'}
    </button>
  )
}

const styles: Record<string, React.CSSProperties> = {
  btn: {
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
    background: 'rgba(255,255,255,0.9)',
    color: '#3a2a2a',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0,0,0,0.1)',
    transition: 'all 0.2s',
  },
}
