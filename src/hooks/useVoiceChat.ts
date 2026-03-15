import { useCallback, useRef, useEffect } from 'react'
import { useVoiceStore } from '../stores/voiceStore'
import { useGameStore } from '../stores/gameStore'
import { VoicePeerConnection, getIceServers } from '../lib/webrtc'
import { isSupabaseConfigured } from '../lib/supabase'

interface VoiceSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'voice-ready'
  from: string
  to: string
  data: RTCSessionDescriptionInit | RTCIceCandidateInit | null
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
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())

  const cleanupPeer = (peerId: string) => {
    const peer = peersRef.current.get(peerId)
    if (peer) {
      peer.close()
      peersRef.current.delete(peerId)
    }
    removePeer(peerId)
    const audio = audioElementsRef.current.get(peerId)
    if (audio) {
      audio.pause()
      audio.srcObject = null
      audioElementsRef.current.delete(peerId)
    }
  }

  // Handle incoming voice signals
  useEffect(() => {
    if (!isVoiceEnabled || !playerId || !isSupabaseConfigured) return

    const handleSignal = async (e: Event) => {
      try {
        const signal = (e as CustomEvent).detail as VoiceSignal
        if (signal.to !== playerId) return

        const fromId = signal.from

        // When a remote peer announces voice-ready, initiate connection
        // The peer with the higher ID sends the offer to avoid duplicates
        if (signal.type === 'voice-ready') {
          if (!peersRef.current.has(fromId) && streamRef.current && playerId > fromId) {
            initiateConnection(fromId)
          }
          return
        }

        const existingPeer = peersRef.current.get(fromId)

        if (signal.type === 'offer') {
          // Glare resolution
          if (existingPeer && existingPeer.signalingState === 'have-local-offer') {
            if (playerId > fromId) return
          }

          if (existingPeer) cleanupPeer(fromId)

          const peer = createPeer(fromId)
          if (streamRef.current) peer.addLocalStream(streamRef.current)
          const answer = await peer.createAnswer(signal.data as RTCSessionDescriptionInit)
          broadcastSignal({ type: 'answer', from: playerId, to: fromId, data: answer })
        } else if (signal.type === 'answer' && existingPeer) {
          if (existingPeer.signalingState === 'have-local-offer') {
            await existingPeer.setAnswer(signal.data as RTCSessionDescriptionInit)
          }
        } else if (signal.type === 'ice-candidate' && existingPeer) {
          await existingPeer.addIceCandidate(signal.data as RTCIceCandidateInit)
        }
      } catch (err) {
        console.error('[Voice] Signal handling error:', err)
      }
    }

    window.addEventListener('voice-signal', handleSignal)
    return () => window.removeEventListener('voice-signal', handleSignal)
  }, [isVoiceEnabled, playerId])

  // When voice is enabled, broadcast voice-ready to all existing players
  // so they know to initiate a connection with us
  useEffect(() => {
    if (!isVoiceEnabled || !playerId || !streamRef.current || !isSupabaseConfigured) return

    const otherPlayerIds = Object.keys(players).filter((id) => id !== playerId)

    for (const otherId of otherPlayerIds) {
      if (!peersRef.current.has(otherId)) {
        // Notify each player that we're voice-ready
        broadcastSignal({ type: 'voice-ready', from: playerId, to: otherId, data: null })
        // If our ID is greater, we also initiate immediately
        if (playerId > otherId) {
          initiateConnection(otherId)
        }
      }
    }

    // Clean up connections for players who left
    const currentPlayerIds = new Set(otherPlayerIds)
    for (const peerId of peersRef.current.keys()) {
      if (!currentPlayerIds.has(peerId)) {
        cleanupPeer(peerId)
      }
    }
  }, [isVoiceEnabled, playerId, players])

  const createPeer = (remoteId: string): VoicePeerConnection => {
    const config = getIceServers()
    const peer = new VoicePeerConnection(config)

    peer.onStream = (stream) => {
      addPeer(remoteId, { playerId: remoteId, stream, isMuted: false })

      const oldAudio = audioElementsRef.current.get(remoteId)
      if (oldAudio) {
        oldAudio.pause()
        oldAudio.srcObject = null
      }

      const audio = new Audio()
      audio.srcObject = stream
      audio.autoplay = true
      audio.play().catch((err) => {
        console.warn('[Voice] Audio play failed:', err)
      })
      audioElementsRef.current.set(remoteId, audio)
    }

    peer.onIceCandidate = (candidate) => {
      broadcastSignal({
        type: 'ice-candidate',
        from: playerId!,
        to: remoteId,
        data: candidate,
      })
    }

    peer.onConnectionStateChange = (state) => {
      console.log(`[Voice] Peer ${remoteId.slice(0, 8)}: ${state}`)
    }

    peersRef.current.set(remoteId, peer)
    return peer
  }

  const initiateConnection = async (remoteId: string) => {
    // Don't create duplicate connections
    if (peersRef.current.has(remoteId)) return
    try {
      const peer = createPeer(remoteId)
      if (streamRef.current) peer.addLocalStream(streamRef.current)
      const offer = await peer.createOffer()
      broadcastSignal({ type: 'offer', from: playerId!, to: remoteId, data: offer })
    } catch (err) {
      console.error('[Voice] Failed to initiate connection:', err)
    }
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
    for (const [id, peer] of peersRef.current) {
      peer.close()
      removePeer(id)
    }
    peersRef.current.clear()

    for (const audio of audioElementsRef.current.values()) {
      audio.pause()
      audio.srcObject = null
    }
    audioElementsRef.current.clear()

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
      for (const audio of audioElementsRef.current.values()) {
        audio.pause()
        audio.srcObject = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return { toggleVoice, toggleMute }
}
