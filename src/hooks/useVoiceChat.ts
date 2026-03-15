import { useCallback, useRef, useEffect } from 'react'
import { useVoiceStore } from '../stores/voiceStore'
import { useGameStore } from '../stores/gameStore'
import { VoicePeerConnection, getIceServers } from '../lib/webrtc'
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
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioSourcesRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map())

  const cleanupPeer = (peerId: string) => {
    const peer = peersRef.current.get(peerId)
    if (peer) {
      peer.close()
      peersRef.current.delete(peerId)
    }
    removePeer(peerId)
    const source = audioSourcesRef.current.get(peerId)
    if (source) {
      source.disconnect()
      audioSourcesRef.current.delete(peerId)
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
        const existingPeer = peersRef.current.get(fromId)

        if (signal.type === 'offer') {
          // Glare resolution: if we both sent offers, the "impolite" peer
          // (higher ID) ignores the incoming offer and keeps its own.
          if (existingPeer && existingPeer.signalingState === 'have-local-offer') {
            if (playerId > fromId) {
              // We are impolite — ignore their offer, they will accept our answer
              return
            }
            // We are polite — discard our offer and accept theirs
          }

          // Close existing peer if any
          if (existingPeer) {
            cleanupPeer(fromId)
          }

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

  // Connect to new players / clean up departed players
  useEffect(() => {
    if (!isVoiceEnabled || !playerId || !streamRef.current || !isSupabaseConfigured) return

    const otherPlayerIds = Object.keys(players).filter((id) => id !== playerId)

    // Connect to new players (only initiate if our ID is greater to avoid duplicate offers)
    for (const otherId of otherPlayerIds) {
      if (!peersRef.current.has(otherId) && playerId > otherId) {
        initiateConnection(otherId)
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
      if (audioContextRef.current) {
        // Disconnect old source if exists
        const oldSource = audioSourcesRef.current.get(remoteId)
        if (oldSource) oldSource.disconnect()
        const source = audioContextRef.current.createMediaStreamSource(stream)
        source.connect(audioContextRef.current.destination)
        audioSourcesRef.current.set(remoteId, source)
      }
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

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

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

    for (const source of audioSourcesRef.current.values()) {
      source.disconnect()
    }
    audioSourcesRef.current.clear()

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

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
      for (const source of audioSourcesRef.current.values()) {
        source.disconnect()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return { toggleVoice, toggleMute }
}
