function buildIceServers(): RTCConfiguration {
  const username = import.meta.env.VITE_TURN_USERNAME
  const credential = import.meta.env.VITE_TURN_CREDENTIAL

  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.relay.metered.ca:80' },
  ]

  if (username && credential) {
    iceServers.push(
      { urls: 'turn:global.relay.metered.ca:80', username, credential },
      { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username, credential },
      { urls: 'turn:global.relay.metered.ca:443', username, credential },
      { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username, credential },
    )
  } else {
    console.warn('[WebRTC] TURN credentials not configured, using STUN only')
    iceServers.push({ urls: 'stun:stun.l.google.com:19302' })
  }

  return { iceServers }
}

let cachedConfig: RTCConfiguration | null = null

export function getIceServers(): RTCConfiguration {
  if (!cachedConfig) cachedConfig = buildIceServers()
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
      // Use event.track directly — event.streams[0] can be undefined in some browsers
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
