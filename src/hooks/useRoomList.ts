import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useGameStore } from '../stores/gameStore'
import type { RoomInfo } from '../types'

const LOBBY_CHANNEL = 'hanami-lobby'

export interface RoomSummary {
  roomId: string
  roomName: string
  playerCount: number
}

// Singleton channel that persists across component mounts
let lobbyChannel: ReturnType<typeof supabase.channel> | null = null
let subscribedPlayerId: string | null = null
let subscribeReady: Promise<void> | null = null

export function useRoomList() {
  const [rooms, setRooms] = useState<RoomSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const playerId = useGameStore((s) => s.playerId)

  useEffect(() => {
    if (!playerId || !isSupabaseConfigured) return

    // Reuse existing channel if same player
    if (lobbyChannel && subscribedPlayerId === playerId) {
      channelRef.current = lobbyChannel
      setIsLoading(false)
      return
    }

    // Clean up old channel if different player
    if (lobbyChannel) {
      lobbyChannel.untrack()
      lobbyChannel.unsubscribe()
      lobbyChannel = null
    }

    const channel = supabase.channel(LOBBY_CHANNEL, {
      config: {
        presence: { key: playerId },
      },
    })

    const syncRooms = () => {
      const state = channel.presenceState()
      const roomMap = new Map<string, { roomName: string; count: number }>()

      for (const [, presences] of Object.entries(state)) {
        for (const presence of presences as unknown as (RoomInfo & { presence_ref: string })[]) {
          if (presence.roomId) {
            const existing = roomMap.get(presence.roomId)
            if (existing) {
              existing.count++
            } else {
              roomMap.set(presence.roomId, {
                roomName: presence.roomName,
                count: 1,
              })
            }
          }
        }
      }

      const roomList: RoomSummary[] = []
      for (const [roomId, info] of roomMap) {
        roomList.push({
          roomId,
          roomName: info.roomName,
          playerCount: info.count,
        })
      }
      setRooms(roomList)
      setIsLoading(false)
    }

    channel.on('presence', { event: 'sync' }, syncRooms)

    subscribeReady = new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLoading(false)
          resolve()
        }
      })
    })

    lobbyChannel = channel
    subscribedPlayerId = playerId
    channelRef.current = channel

    // Cleanup on beforeunload
    const cleanup = () => {
      channel.untrack()
      channel.unsubscribe()
      lobbyChannel = null
      subscribedPlayerId = null
      subscribeReady = null
    }
    window.addEventListener('beforeunload', cleanup)
    window.addEventListener('pagehide', cleanup)

    return () => {
      window.removeEventListener('beforeunload', cleanup)
      window.removeEventListener('pagehide', cleanup)
      // Do NOT unsubscribe here — keep channel alive across component remounts
    }
  }, [playerId])

  const joinRoom = useCallback(
    async (roomId: string, roomName: string) => {
      const state = useGameStore.getState()
      if (!state.playerId) return

      // Wait for lobby channel to become available (may not exist yet if playerId was just set)
      let ch = channelRef.current || lobbyChannel
      if (!ch) {
        // Poll briefly for channel to be created by useEffect
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 100))
          ch = channelRef.current || lobbyChannel
          if (ch) break
        }
        if (!ch) return
      }

      // Wait for channel to be subscribed before tracking
      if (subscribeReady) await subscribeReady

      useGameStore.getState().setRoomId(roomId)
      useGameStore.getState().setRoomName(roomName)

      await ch.track({
        roomId,
        roomName,
        playerId: state.playerId,
        playerName: state.playerName,
        avatar: state.avatar,
      })
    },
    []
  )

  const createRoom = useCallback(
    async (roomName: string) => {
      const roomId = crypto.randomUUID().slice(0, 8)
      await joinRoom(roomId, roomName)
      return roomId
    },
    [joinRoom]
  )

  const leaveRoom = useCallback(async () => {
    const ch = channelRef.current || lobbyChannel
    if (ch) {
      await ch.untrack()
    }
    useGameStore.getState().clearRoom()
  }, [])

  return { rooms, isLoading, createRoom, joinRoom, leaveRoom }
}
