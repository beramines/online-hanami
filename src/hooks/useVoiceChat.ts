import { useCallback, useRef, useEffect } from 'react'
import { useVoiceStore } from '../stores/voiceStore'
import { useGameStore } from '../stores/gameStore'
import { VoicePeerConnection } from '../lib/webrtc'
import { isSupabaseConfigured } from '../lib/supabase'

interface VoiceSignal {
  type: 'offer' | 'answer' | 'ice-candidate'
  from: string
  to: string
  data: RTCSessionDescriptionInit | RTCIceCandidateInit
}

export function useVoiceChat() {
  const isVoiceEnabled = useVoiceStore((s) => s.isVoiceEnabled)
  const isMuted = useVoiceStore((s) => s.isMuted)
  const setVoiceEnabled = useVoiceStore((s) => s.setVoiceEnabled)
  const setMuted = useVoiceStore((s) => s.setMuted)
  const setLocalStream = useVoiceStore((s) => s.setLocalStream)
  const addPeer = useVoiceStore((s) => s.addPeer)
  const removePeer = useVoiceStore((s) => s.removePeer)
  const playerId = useGameStore((s) => s.playerId)
  const players = useGameStore((s) => s.players)
  const streamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, VoicePeerConnection>>(new Map())

  // Handle incoming voice signals
  useEffect(() => {
    if (!isVoiceEnabled || !playerId || !isSupabaseConfigured) return

    const handleSignal = async (e: Event) => {
      const signal = (e as CustomEvent).detail as VoiceSignal
      if (signal.to !== playerId) return

      const fromId = signal.from
      let peer = peersRef.current.get(fromId)

      if (signal.type === 'offer') {
        // Create new peer for incoming offer
        peer = createPeer(fromId)
        if (streamRef.current) peer.addLocalStream(streamRef.current)
        const answer = await peer.createAnswer(signal.data as RTCSessionDescriptionInit)
        broadcastSignal({ type: 'answer', from: playerId, to: fromId, data: answer })
      } else if (signal.type === 'answer' && peer) {
        await peer.setAnswer(signal.data as RTCSessionDescriptionInit)
      } else if (signal.type === 'ice-candidate' && peer) {
        await peer.addIceCandidate(signal.data as RTCIceCandidateInit)
      }
    }

    window.addEventListener('voice-signal', handleSignal)
    return () => window.removeEventListener('voice-signal', handleSignal)
  }, [isVoiceEnabled, playerId])

  // Connect to existing players when voice is enabled
  useEffect(() => {
    if (!isVoiceEnabled || !playerId || !streamRef.current || !isSupabaseConfigured) return

    const otherPlayers = Object.keys(players).filter((id) => id !== playerId)
    for (const otherId of otherPlayers) {
      if (!peersRef.current.has(otherId)) {
        initiateConnection(otherId)
      }
    }
  }, [isVoiceEnabled, playerId, players])

  const createPeer = (remoteId: string): VoicePeerConnection => {
    const peer = new VoicePeerConnection()

    peer.onStream = (stream) => {
      addPeer(remoteId, { playerId: remoteId, stream, isMuted: false })
      // Play remote audio
      const audio = new Audio()
      audio.srcObject = stream
      audio.play().catch(() => {})
    }

    peer.onIceCandidate = (candidate) => {
      broadcastSignal({
        type: 'ice-candidate',
        from: playerId!,
        to: remoteId,
        data: candidate,
      })
    }

    peersRef.current.set(remoteId, peer)
    return peer
  }

  const initiateConnection = async (remoteId: string) => {
    const peer = createPeer(remoteId)
    if (streamRef.current) peer.addLocalStream(streamRef.current)
    const offer = await peer.createOffer()
    broadcastSignal({ type: 'offer', from: playerId!, to: remoteId, data: offer })
  }

  const broadcastSignal = (signal: VoiceSignal) => {
    window.dispatchEvent(new CustomEvent('send-voice-signal', { detail: signal }))
  }

  const startVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setLocalStream(stream)
      setVoiceEnabled(true)
    } catch (err) {
      console.error('Failed to access microphone:', err)
      alert('マイクへのアクセスが許可されませんでした')
    }
  }, [setLocalStream, setVoiceEnabled])

  const stopVoice = useCallback(() => {
    // Close all peer connections
    for (const [id, peer] of peersRef.current) {
      peer.close()
      removePeer(id)
    }
    peersRef.current.clear()

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setLocalStream(null)
    setVoiceEnabled(false)
    setMuted(false)
  }, [setLocalStream, setVoiceEnabled, setMuted, removePeer])

  const toggleVoice = useCallback(() => {
    if (isVoiceEnabled) {
      stopVoice()
    } else {
      startVoice()
    }
  }, [isVoiceEnabled, startVoice, stopVoice])

  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = isMuted
        setMuted(!isMuted)
      }
    }
  }, [isMuted, setMuted])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const peer of peersRef.current.values()) {
        peer.close()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return { toggleVoice, toggleMute }
}
