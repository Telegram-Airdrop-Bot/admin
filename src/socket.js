import { io } from "socket.io-client";

// Make sure this matches your backend port!
export const socket = io("https://joingroup-8835.onrender.com", {
  transports: ["websocket", "polling"],
  withCredentials: true
});
