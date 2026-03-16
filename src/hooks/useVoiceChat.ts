import { useCallback, useRef, useEffect, useState } from 'react'
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
  const updatePlayer = useGameStore((s) => s.updatePlayer)

  // Silent stream used when mic is off (allows receiving without mic permission)
  const silentStreamRef = useRef<{ stream: MediaStream; ctx: AudioContext } | null>(null)
  // Real mic stream
  const micStreamRef = useRef<MediaStream | null>(null)
  // The stream currently being sent (silent or mic)
  const activeStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, VoicePeerConnection>>(new Map())
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const analysersRef = useRef<Map<string, { analyser: AnalyserNode; ctx: AudioContext }>>(new Map())
  const speakingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const notifiedPeersRef = useRef<Set<string>>(new Set())

  // Use state (not ref) so changes trigger effects
  const [streamReady, setStreamReady] = useState(false)
  // Counter to force re-run of connection effect after peer cleanup
  const [reconnectTrigger, setReconnectTrigger] = useState(0)

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
    const analyserEntry = analysersRef.current.get(peerId)
    if (analyserEntry) {
      analyserEntry.ctx.close()
      analysersRef.current.delete(peerId)
    }
    updatePlayer(peerId, { isSpeaking: false })
  }

  // Handle incoming voice signals
  useEffect(() => {
    if (!isListening || !playerId || !isSupabaseConfigured) return

    const handleSignal = async (e: Event) => {
      try {
        const signal = (e as CustomEvent).detail as VoiceSignal
        if (signal.to !== playerId) return

        const fromId = signal.from
        console.log(`[Voice] Received signal: ${signal.type} from ${fromId.slice(0, 8)}`)

        if (signal.type === 'voice-ready') {
          const hasPeer = peersRef.current.has(fromId)
          const hasStream = !!activeStreamRef.current
          const shouldInitiate = playerId! > fromId
          console.log(`[Voice] voice-ready: hasPeer=${hasPeer}, hasStream=${hasStream}, shouldInitiate=${shouldInitiate}`)
          if (!hasPeer && hasStream && shouldInitiate) {
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

          const peer = await createPeer(fromId)
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

  // Speaking detection: monitor audio analysers periodically
  useEffect(() => {
    if (!isListening) return

    speakingIntervalRef.current = setInterval(() => {
      for (const [peerId, { analyser }] of analysersRef.current) {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((sum, v) => sum + v, 0) / data.length
        const speaking = avg > 15
        updatePlayer(peerId, { isSpeaking: speaking })
      }
    }, 150)

    return () => {
      if (speakingIntervalRef.current) {
        clearInterval(speakingIntervalRef.current)
        speakingIntervalRef.current = null
      }
    }
  }, [isListening, updatePlayer])

  // When listening is enabled and stream is ready, broadcast voice-ready and connect
  useEffect(() => {
    if (!isListening || !playerId || !streamReady || !isSupabaseConfigured) return

    const otherPlayerIds = Object.keys(players).filter((id) => id !== playerId)
    console.log(`[Voice] Connection effect: ${otherPlayerIds.length} other player(s), notified=${notifiedPeersRef.current.size}, peers=${peersRef.current.size}`)

    for (const otherId of otherPlayerIds) {
      const hasPeer = peersRef.current.has(otherId)
      const notified = notifiedPeersRef.current.has(otherId)
      if (!hasPeer && !notified) {
        notifiedPeersRef.current.add(otherId)
        console.log(`[Voice] Sending voice-ready to ${otherId.slice(0, 8)}, shouldInitiate=${playerId > otherId}`)
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
  }, [isListening, playerId, players, streamReady, reconnectTrigger])

  const createPeer = async (remoteId: string): Promise<VoicePeerConnection> => {
    const config = await getIceServers()
    const peer = new VoicePeerConnection(config)

    peer.onStream = (stream) => {
      addPeer(remoteId, { playerId: remoteId, stream })

      // Reuse existing audio element to avoid play/pause race conditions
      let audio = audioElementsRef.current.get(remoteId)
      if (audio) {
        audio.srcObject = stream
      } else {
        audio = new Audio()
        audio.srcObject = stream
        audioElementsRef.current.set(remoteId, audio)
      }
      audio.volume = 1
      audio.play().catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('[Voice] Audio play failed:', err)
        }
      })

      // Set up audio analyser for speaking detection
      const oldAnalyser = analysersRef.current.get(remoteId)
      if (oldAnalyser) oldAnalyser.ctx.close()

      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analysersRef.current.set(remoteId, { analyser, ctx })
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
        // Trigger reconnection attempt
        setReconnectTrigger((n) => n + 1)
      }
    }

    peersRef.current.set(remoteId, peer)
    return peer
  }

  const initiateConnection = async (remoteId: string) => {
    if (peersRef.current.has(remoteId)) return
    try {
      const peer = await createPeer(remoteId)
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
    setStreamReady(true)
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

    for (const { ctx } of analysersRef.current.values()) {
      ctx.close()
    }
    analysersRef.current.clear()

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
    setStreamReady(false)
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
      for (const { ctx } of analysersRef.current.values()) {
        ctx.close()
      }
      if (speakingIntervalRef.current) {
        clearInterval(speakingIntervalRef.current)
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
