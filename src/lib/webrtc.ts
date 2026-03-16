const STUN_ONLY_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.relay.metered.ca:80' },
    { urls: 'stun:stun.l.google.com:19302' },
  ],
}

let cachedConfig: RTCConfiguration | null = null

export async function getIceServers(): Promise<RTCConfiguration> {
  if (cachedConfig) return cachedConfig

  try {
    const res = await fetch('/api/turn-credentials')
    if (res.ok) {
      const data = await res.json()
      cachedConfig = { iceServers: data.iceServers }
      return cachedConfig
    }
  } catch (err) {
    console.warn('[WebRTC] Failed to fetch TURN credentials:', err)
  }

  console.warn('[WebRTC] Using STUN only (no TURN)')
  cachedConfig = STUN_ONLY_CONFIG
  return cachedConfig
}

export class VoicePeerConnection {
  private pc: RTCPeerConnection
  private remoteStream: MediaStream
  private pendingCandidates: RTCIceCandidateInit[] = []
  private remoteDescriptionSet = false
  onStream: ((stream: MediaStream) => void) | null = null
  onIceCandidate: ((candidate: RTCIceCandidateInit) => void) | null = null
  onConnectionStateChange: ((state: RTCPeerConnectionState) => void) | null = null

  constructor(config: RTCConfiguration) {
    this.pc = new RTCPeerConnection(config)
    this.remoteStream = new MediaStream()

    this.pc.ontrack = (event) => {
      this.remoteStream.addTrack(event.track)
      this.onStream?.(this.remoteStream)
    }

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidate?.(event.candidate.toJSON())
      }
    }

    this.pc.onconnectionstatechange = () => {
      this.onConnectionStateChange?.(this.pc.connectionState)
    }
  }

  addLocalStream(stream: MediaStream) {
    stream.getTracks().forEach((track) => {
      this.pc.addTrack(track, stream)
    })
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    return offer
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer))
    this.remoteDescriptionSet = true
    await this.flushPendingCandidates()
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    return answer
  }

  async setAnswer(answer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer))
    this.remoteDescriptionSet = true
    await this.flushPendingCandidates()
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (this.remoteDescriptionSet) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    } else {
      this.pendingCandidates.push(candidate)
    }
  }

  private async flushPendingCandidates() {
    for (const candidate of this.pendingCandidates) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    }
    this.pendingCandidates = []
  }

  async replaceAudioTrack(track: MediaStreamTrack) {
    const sender = this.pc.getSenders().find((s) => s.track?.kind === 'audio')
    if (sender) {
      await sender.replaceTrack(track)
    }
  }

  close() {
    this.pc.close()
  }

  get connectionState() {
    return this.pc.connectionState
  }

  get signalingState() {
    return this.pc.signalingState
  }
}
