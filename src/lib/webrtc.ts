const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export class VoicePeerConnection {
  private pc: RTCPeerConnection
  private remoteStream: MediaStream
  onStream: ((stream: MediaStream) => void) | null = null
  onIceCandidate: ((candidate: RTCIceCandidateInit) => void) | null = null

  constructor() {
    this.pc = new RTCPeerConnection(ICE_SERVERS)
    this.remoteStream = new MediaStream()

    this.pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track)
      })
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
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    return answer
  }

  async setAnswer(answer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer))
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
  }

  close() {
    this.pc.close()
  }

  get connectionState() {
    return this.pc.connectionState
  }
}
