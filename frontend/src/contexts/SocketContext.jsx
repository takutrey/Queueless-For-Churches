import { createContext, useContext, useEffect, useRef } from "react";
import { getSocket } from "./Socket.js";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
