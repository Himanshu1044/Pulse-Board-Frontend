import { io, type Socket } from "socket.io-client";

const apiUrl: string = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SOCKET_URL: string = import.meta.env.VITE_SOCKET_URL || apiUrl.replace(/\/api\/?$/, "");

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  if (!socket) socket = io(SOCKET_URL, { auth: { token } });
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}
