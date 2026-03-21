interface Env {
  TURN_USERNAME: string
  TURN_CREDENTIAL: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { TURN_USERNAME, TURN_CREDENTIAL } = context.env

  if (!TURN_USERNAME || !TURN_CREDENTIAL) {
    return Response.json(
      {
        iceServers: [
          { urls: 'stun:stun.relay.metered.ca:80' },
          { urls: 'stun:stun.l.google.com:19302' },
        ],
      },
      {
        headers: { 'Cache-Control': 'public, max-age=3600' },
      },
    )
  }

  return Response.json(
    {
      iceServers: [
        { urls: 'stun:stun.relay.metered.ca:80' },
        { urls: 'turn:global.relay.metered.ca:80', username: TURN_USERNAME, credential: TURN_CREDENTIAL },
        { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: TURN_USERNAME, credential: TURN_CREDENTIAL },
        { urls: 'turn:global.relay.metered.ca:443', username: TURN_USERNAME, credential: TURN_CREDENTIAL },
        { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: TURN_USERNAME, credential: TURN_CREDENTIAL },
      ],
    },
    {
      headers: { 'Cache-Control': 'private, max-age=300' },
    },
  )
}
