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

/**
 * Create a silent audio stream for WebRTC connections.
 * This allows receiving audio without requesting mic permission.
 */
function createSilentStream(): { stream: MediaStream; ctx: AudioContext } {
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  gain.gain.value = 0
  const dst = ctx.createMediaStreamDestination()
  oscillator.connect(gain)
  gain.connect(dst)
  oscillator.start()
  return { stream: dst.stream, ctx }
}

export function useVoiceChat() {
  const isListening = useVoiceStore((s) => s.isListening)
  const isMicEnabled = useVoiceStore((s) => s.isMicEnabled)
  const setListening = useVoiceStore((s) => s.setListening)
  const setMicEnabled = useVoiceStore((s) => s.setMicEnabled)
  const setLocalStream = useVoiceStore((s) => s.setLocalStream)
  const addPeer = useVoiceStore((s) => s.addPeer)
  const removePeer = useVoiceStore((s) => s.removePeer)
  const playerId = useGameStore((s) => s.playerId)
  const players = useGameStore((s) => s.players)

  // Silent stream used when mic is off (allows receiving without mic permission)
  const silentStreamRef = useRef<{ stream: MediaStream; ctx: AudioContext } | null>(null)
  // Real mic stream
  const micStreamRef = useRef<MediaStream | null>(null)
  // The stream currently being sent (silent or mic)
  const activeStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, VoicePeerConnection>>(new Map())
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const notifiedPeersRef = useRef<Set<string>>(new Set())

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
    if (!isListening || !playerId || !isSupabaseConfigured) return

    const handleSignal = async (e: Event) => {
      try {
        const signal = (e as CustomEvent).detail as VoiceSignal
        if (signal.to !== playerId) return

        const fromId = signal.from

        if (signal.type === 'voice-ready') {
          if (!peersRef.current.has(fromId) && activeStreamRef.current && playerId > fromId) {
            initiateConnection(fromId)
          }
          return
        }

        const existingPeer = peersRef.current.get(fromId)

        if (signal.type === 'offer') {
          if (existingPeer && existingPeer.signalingState === 'have-local-offer') {
            if (playerId > fromId) return
          }

          if (existingPeer) cleanupPeer(fromId)

          const peer = createPeer(fromId)
          if (activeStreamRef.current) peer.addLocalStream(activeStreamRef.current)
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
  }, [isListening, playerId])

  // When listening is enabled, broadcast voice-ready and connect
  useEffect(() => {
    if (!isListening || !playerId || !activeStreamRef.current || !isSupabaseConfigured) return

    const otherPlayerIds = Object.keys(players).filter((id) => id !== playerId)

    for (const otherId of otherPlayerIds) {
      if (!peersRef.current.has(otherId) && !notifiedPeersRef.current.has(otherId)) {
        notifiedPeersRef.current.add(otherId)
        broadcastSignal({ type: 'voice-ready', from: playerId, to: otherId, data: null })
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
        notifiedPeersRef.current.delete(peerId)
      }
    }
  }, [isListening, playerId, players])

  const createPeer = (remoteId: string): VoicePeerConnection => {
    const config = getIceServers()
    const peer = new VoicePeerConnection(config)

    peer.onStream = (stream) => {
      addPeer(remoteId, { playerId: remoteId, stream })

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
      if (state === 'disconnected' || state === 'failed') {
        cleanupPeer(remoteId)
        notifiedPeersRef.current.delete(remoteId)
      }
    }

    peersRef.current.set(remoteId, peer)
    return peer
  }

  const initiateConnection = async (remoteId: string) => {
    if (peersRef.current.has(remoteId)) return
    try {
      const peer = createPeer(remoteId)
      if (activeStreamRef.current) peer.addLocalStream(activeStreamRef.current)
      const offer = await peer.createOffer()
      broadcastSignal({ type: 'offer', from: playerId!, to: remoteId, data: offer })
    } catch (err) {
      console.error('[Voice] Failed to initiate connection:', err)
    }
  }

  const broadcastSignal = (signal: VoiceSignal) => {
    window.dispatchEvent(new CustomEvent('send-voice-signal', { detail: signal }))
  }

  // Start listening: create silent stream and enable WebRTC connections
  const startListening = useCallback(() => {
    const silent = createSilentStream()
    silentStreamRef.current = silent
    activeStreamRef.current = silent.stream
    setListening(true)
  }, [setListening])

  // Stop listening: close everything
  const stopListening = useCallback(() => {
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
    notifiedPeersRef.current.clear()

    // Stop mic if active
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop())
      micStreamRef.current = null
    }

    // Close silent stream
    if (silentStreamRef.current) {
      silentStreamRef.current.ctx.close()
      silentStreamRef.current = null
    }

    activeStreamRef.current = null
    setLocalStream(null)
    setListening(false)
    setMicEnabled(false)
  }, [setLocalStream, setListening, setMicEnabled, removePeer])

  // Start mic: get real audio and replace tracks on all peer connections
  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = stream
      setLocalStream(stream)

      const micTrack = stream.getAudioTracks()[0]
      // Replace silent track with mic track on all existing connections
      for (const peer of peersRef.current.values()) {
        await peer.replaceAudioTrack(micTrack)
      }
      activeStreamRef.current = stream
      setMicEnabled(true)
    } catch (err) {
      console.error('Failed to access microphone:', err)
      alert('マイクへのアクセスが許可されませんでした')
    }
  }, [setLocalStream, setMicEnabled])

  // Stop mic: revert to silent stream
  const stopMic = useCallback(async () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop())
      micStreamRef.current = null
    }

    // Revert to silent track on all connections
    if (silentStreamRef.current) {
      const silentTrack = silentStreamRef.current.stream.getAudioTracks()[0]
      for (const peer of peersRef.current.values()) {
        await peer.replaceAudioTrack(silentTrack)
      }
      activeStreamRef.current = silentStreamRef.current.stream
    }

    setLocalStream(null)
    setMicEnabled(false)
  }, [setLocalStream, setMicEnabled])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  const toggleMic = useCallback(() => {
    if (isMicEnabled) {
      stopMic()
    } else {
      startMic()
    }
  }, [isMicEnabled, startMic, stopMic])

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
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (silentStreamRef.current) {
        silentStreamRef.current.ctx.close()
      }
    }
  }, [])

  return { toggleListening, toggleMic }
}
