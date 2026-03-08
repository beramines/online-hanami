import { useVoiceChat } from '../../hooks/useVoiceChat'
import { useVoiceStore } from '../../stores/voiceStore'

export function VoiceControls() {
  const isVoiceEnabled = useVoiceStore((s) => s.isVoiceEnabled)
  const isMuted = useVoiceStore((s) => s.isMuted)
  const { toggleVoice, toggleMute } = useVoiceChat()

  return (
    <div style={styles.container}>
      <button
        style={{
          ...styles.btn,
          background: isVoiceEnabled ? 'rgba(74,222,128,0.9)' : 'rgba(255,255,255,0.9)',
          color: isVoiceEnabled ? '#fff' : '#3a2a2a',
        }}
        onClick={toggleVoice}
        title={isVoiceEnabled ? 'ボイスチャットOFF' : 'ボイスチャットON'}
      >
        {isVoiceEnabled ? '🎙️ ON' : '🎙️ OFF'}
      </button>

      {isVoiceEnabled && (
        <button
          style={{
            ...styles.btn,
            background: isMuted ? 'rgba(239,68,68,0.9)' : 'rgba(255,255,255,0.9)',
            color: isMuted ? '#fff' : '#3a2a2a',
          }}
          onClick={toggleMute}
          title={isMuted ? 'ミュート解除' : 'ミュート'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  btn: {
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0,0,0,0.1)',
    transition: 'all 0.2s',
  },
}
