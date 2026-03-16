import { useVoiceChat } from '../../hooks/useVoiceChat'
import { useVoiceStore } from '../../stores/voiceStore'

export function VoiceControls() {
  const isListening = useVoiceStore((s) => s.isListening)
  const isMicEnabled = useVoiceStore((s) => s.isMicEnabled)
  const { toggleListening, toggleMic } = useVoiceChat()

  return (
    <div style={styles.container}>
      <button
        style={{
          ...styles.btn,
          background: isListening ? 'rgba(74,222,128,0.9)' : 'rgba(255,255,255,0.9)',
          color: isListening ? '#fff' : '#3a2a2a',
        }}
        onClick={toggleListening}
        title={isListening ? '聞くOFF' : '聞くON'}
      >
        {isListening ? '🔊 聞く' : '🔇 聞く'}
      </button>

      {isListening && (
        <button
          style={{
            ...styles.btn,
            background: isMicEnabled ? 'rgba(74,222,128,0.9)' : 'rgba(255,255,255,0.9)',
            color: isMicEnabled ? '#fff' : '#3a2a2a',
          }}
          onClick={toggleMic}
          title={isMicEnabled ? 'マイクOFF' : 'マイクON'}
        >
          {isMicEnabled ? '🎙️ ON' : '🎙️ OFF'}
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
