import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const DEV_PORTS = ['5173', '5174', '5175'];
const SERVER_URL = (typeof window !== 'undefined' && DEV_PORTS.includes(window.location.port))
  ? 'http://localhost:3001'
  : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

export function getSocket(token: string): Socket {
  if (socket && socket.connected) return socket;
  if (socket) socket.disconnect();
  socket = io(SERVER_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getActiveSocket(): Socket | null {
  return socket;
}
