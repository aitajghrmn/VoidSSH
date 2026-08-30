import { io, type Socket } from 'socket.io-client'
import { API_URL } from '../api/client'

export function createSshSocket(): Socket {
  return io(`${API_URL}/ws/ssh-session`, {
    withCredentials: true,
    autoConnect: false,
    // Skip the default polling-then-upgrade handshake and go straight to a
    // websocket. The backend runs Flask-SocketIO in threading mode with
    // simple-websocket specifically so this works, and for an interactive
    // shell the polling round-trips add up to real, felt latency.
    transports: ['websocket'],
  })
}
