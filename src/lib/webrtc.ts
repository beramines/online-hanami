const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export class VoicePeerConnection {
  private pc: RTCPeerConnection
  private remoteStream: MediaStream
  private pendingCandidates: RTCIceCandidateInit[] = []
  private remoteDescriptionSet = false
  onStream: ((stream: MediaStream) => void) | null = null
  onIceCandidate: ((candidate: RTCIceCandidateInit) => void) | null = null

  constructor() {
    this.pc = new RTCPeerConnection(ICE_SERVERS)
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

  close() {
    this.pc.close()
  }

  get connectionState() {
    return this.pc.connectionState
  }
}
