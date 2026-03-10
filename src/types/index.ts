export type AvatarType = 'male' | 'female' | 'dog' | 'cat' | 'seal'

export interface Player {
  id: string
  name: string
  avatar: AvatarType
  position: [number, number, number]
  rotation: number
  isSpeaking: boolean
}

export interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  text: string
  timestamp: number
}

export interface RoomState {
  roomId: string
  players: Record<string, Player>
  maxPlayers: number
}

export interface RoomInfo {
  roomId: string
  roomName: string
  playerId: string
  playerName: string
  avatar: AvatarType
}

export interface VoicePeer {
  playerId: string
  stream: MediaStream | null
  isMuted: boolean
}
