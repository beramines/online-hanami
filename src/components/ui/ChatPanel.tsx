import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { useGameStore } from '../../stores/gameStore'
import { useRealtimeChat } from '../../hooks/useRealtimeChat'
import { useIsMobile } from '../../hooks/useIsMobile'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const messages = useChatStore((s) => s.messages)
  const isOpen = useChatStore((s) => s.isOpen)
  const toggleOpen = useChatStore((s) => s.toggleOpen)
  const playerId = useGameStore((s) => s.playerId)
  const playerName = useGameStore((s) => s.playerName)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { sendMessage } = useRealtimeChat()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || !playerId) return
    sendMessage({
      id: crypto.randomUUID(),
      playerId,
      playerName,
      text: input.trim(),
      timestamp: Date.now(),
    })
    setInput('')
  }

  const bottomOffset = isMobile ? '170px' : '16px'

  return (
    <div style={{ ...styles.container, bottom: bottomOffset }}>
      <button style={styles.toggle} onClick={toggleOpen}>
        💬 {isOpen ? '閉じる' : 'チャット'}
        {!isOpen && messages.length > 0 && (
          <span style={styles.badge}>{Math.min(messages.length, 99)}</span>
        )}
      </button>

      {isOpen && (
        <div style={styles.panel}>
          <div ref={scrollRef} style={{
            ...styles.messages,
            height: isMobile ? 'min(180px, 25vh)' : 'min(250px, 35vh)',
          }}>
            {messages.length === 0 && (
              <p style={styles.empty}>メッセージはまだありません</p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  ...styles.message,
                  ...(msg.playerId === playerId ? styles.myMessage : {}),
                }}
              >
                <span style={styles.msgName}>{msg.playerName}</span>
                <span style={styles.msgText}>{msg.text}</span>
              </div>
            ))}
          </div>
          <div style={styles.inputRow}>
            <input
              style={styles.input}
              type="text"
              placeholder="メッセージを入力..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              maxLength={200}
            />
            <button style={styles.sendBtn} onClick={handleSend}>
              送信
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    left: '16px',
    width: '340px',
    maxWidth: 'min(340px, calc(100vw - 32px))',
    pointerEvents: 'auto',
    zIndex: 25,
  },
  toggle: {
    padding: '8px 16px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.9)',
    color: '#3a2a2a',
    fontSize: '13px',
    fontWeight: 500,
    marginBottom: '8px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0,0,0,0.1)',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    background: '#e85d7a',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 700,
    borderRadius: '10px',
    padding: '2px 6px',
    minWidth: '18px',
    textAlign: 'center',
  },
  panel: {
    background: 'rgba(255,255,255,0.92)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.5)',
  },
  messages: {
    overflowY: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  empty: {
    color: '#999',
    fontSize: '13px',
    textAlign: 'center',
    marginTop: '40px',
  },
  message: {
    display: 'flex',
    flexDirection: 'column',
    padding: '6px 10px',
    borderRadius: '10px',
    background: '#fef7f8',
    maxWidth: '85%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    background: '#fdeef0',
  },
  msgName: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#b22d4a',
    marginBottom: '2px',
  },
  msgText: {
    fontSize: '13px',
    color: '#3a2a2a',
    wordBreak: 'break-word',
  },
  inputRow: {
    display: 'flex',
    padding: '8px',
    gap: '6px',
    borderTop: '1px solid rgba(0,0,0,0.05)',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid #fbd5dc',
    fontSize: '16px',
    background: '#fff',
    color: '#3a2a2a',
  },
  sendBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    background: '#e85d7a',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
  },
}
