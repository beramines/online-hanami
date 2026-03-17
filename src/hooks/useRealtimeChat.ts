import { useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useChatStore } from '../stores/chatStore'
import { useGameStore } from '../stores/gameStore'
import type { ChatMessage, Player } from '../types'

export function useRealtimeChat() {
  const addMessage = useChatStore((s) => s.addMessage)
  const updatePlayer = useGameStore((s) => s.updatePlayer)
  const removePlayer = useGameStore((s) => s.removePlayer)
  const playerId = useGameStore((s) => s.playerId)
  const playerName = useGameStore((s) => s.playerName)
  const avatar = useGameStore((s) => s.avatar)
  const roomId = useGameStore((s) => s.roomId)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const lastBroadcast = useRef(0)

  useEffect(() => {
    if (!playerId || !roomId || !isSupabaseConfigured) return

    const channel = supabase.channel(`hanami-room:${roomId}`, {
      config: {
        presence: { key: playerId },
        broadcast: { self: false },
      },
    })

    // Chat messages (skip own messages — already added locally)
    channel.on('broadcast', { event: 'chat' }, (payload) => {
      const msg = payload.payload as ChatMessage
      if (msg.playerId !== playerId) {
        addMessage(msg)
      }
    })

    // Position updates
    channel.on('broadcast', { event: 'position' }, (payload) => {
      const data = payload.payload as { id: string; position: [number, number, number]; rotation: number }
      if (data.id !== playerId) {
        updatePlayer(data.id, { position: data.position, rotation: data.rotation })
      }
    })

    // Voice signaling
    channel.on('broadcast', { event: 'voice-signal' }, (payload) => {
      const signal = payload.payload
      console.log(`[Voice:Channel] Received broadcast: type=${signal.type}, from=${signal.from?.slice(0, 8)}, to=${signal.to?.slice(0, 8)}, myId=${playerId?.slice(0, 8)}`)
      window.dispatchEvent(new CustomEvent('voice-signal', { detail: signal }))
    })

    // Presence sync — get all currently present players
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const presentIds = new Set<string>()
      for (const [, presences] of Object.entries(state)) {
        for (const presence of presences as unknown as (Player & { presence_ref: string })[]) {
          if (presence.id && presence.id !== playerId && presence.avatar) {
            presentIds.add(presence.id)
            updatePlayer(presence.id, {
              id: presence.id,
              name: presence.name,
              avatar: presence.avatar,
              position: presence.position || [0, 0, 0],
              rotation: presence.rotation || 0,
              isSpeaking: false,
            })
          }
        }
      }
      // Presenceに存在しないプレイヤーを削除
      const currentPlayers = useGameStore.getState().players
      for (const id of Object.keys(currentPlayers)) {
        if (id !== playerId && !presentIds.has(id)) {
          removePlayer(id)
        }
      }
    })

    // Presence join
    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      for (const presence of newPresences) {
        const p = presence as unknown as Player & { presence_ref: string }
        if (p.id !== playerId) {
          updatePlayer(p.id, {
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            position: p.position || [0, 0, 0],
            rotation: p.rotation || 0,
            isSpeaking: false,
          })
        }
      }
    })

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      for (const presence of leftPresences) {
        const p = presence as unknown as { id: string }
        removePlayer(p.id)
      }
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: playerId,
          name: playerName,
          avatar,
          position: [0, 0, 5],
          rotation: 0,
        })

        // Register broadcast function AFTER channel is subscribed
        const broadcastFn = (position: [number, number, number], rotation: number) => {
          const now = Date.now()
          if (now - lastBroadcast.current < 50) return
          lastBroadcast.current = now
          channel.send({
            type: 'broadcast',
            event: 'position',
            payload: { id: playerId, position, rotation },
          })
        }
        useGameStore.getState().setBroadcastPosition(broadcastFn)
      }
    })

    const cleanup = () => {
      channel.untrack()
      channel.unsubscribe()
      useGameStore.getState().setBroadcastPosition(null)
    }
    window.addEventListener('beforeunload', cleanup)
    window.addEventListener('pagehide', cleanup)

    channelRef.current = channel

    // Listen for voice signal sends from useVoiceChat
    const handleSendVoiceSignal = (e: Event) => {
      channel.send({
        type: 'broadcast',
        event: 'voice-signal',
        payload: (e as CustomEvent).detail,
      })
    }
    window.addEventListener('send-voice-signal', handleSendVoiceSignal)

    return () => {
      window.removeEventListener('beforeunload', cleanup)
      window.removeEventListener('pagehide', cleanup)
      window.removeEventListener('send-voice-signal', handleSendVoiceSignal)
      cleanup()
    }
  }, [playerId, playerName, avatar, roomId, addMessage, updatePlayer, removePlayer])

  const sendMessage = useCallback(
    (message: ChatMessage) => {
      addMessage(message)
      channelRef.current?.send({
        type: 'broadcast',
        event: 'chat',
        payload: message,
      })
    },
    [addMessage]
  )

  return { sendMessage }
}
