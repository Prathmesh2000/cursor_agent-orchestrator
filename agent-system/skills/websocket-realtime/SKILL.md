---
name: websocket-realtime
description: Use when implementing real-time features. Triggers: "WebSocket", "real-time", "Socket.io", "live updates", "SSE", "Server-Sent Events", "push notifications", "live chat", "presence", "collaborative", "pub/sub", or any feature requiring server-to-client push.
---

# WebSocket & Real-Time Skill

Implement production real-time features: WebSocket with Socket.io, Server-Sent Events (SSE), React state sync, presence, and connection resilience.

---

## Choose the right protocol

```
WebSocket (Socket.io):  Bidirectional — chat, multiplayer, collaboration
SSE:                    Server→client only — notifications, live feeds, dashboards  
Polling:                Fallback only — avoid if WebSocket/SSE possible
```

---

## Socket.io Server

```typescript
// server/socket.ts
import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';

export function createSocketServer(app: Express) {
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
    pingTimeout: 10000,
    pingInterval: 25000,
  });

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as any;
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, name } = socket.data.user;
    console.log(`User ${name} connected: ${socket.id}`);

    // Join user's personal room (for targeted messages)
    socket.join(`user:${userId}`);

    // ─── Presence ─────────────────────────────────────────────────
    socket.on('join:room', async (roomId: string) => {
      socket.join(roomId);
      // Notify others in room
      socket.to(roomId).emit('user:joined', { userId, name });
      // Send current presence list to joining user
      const sockets = await io.in(roomId).fetchSockets();
      const users = sockets.map(s => s.data.user);
      socket.emit('presence:list', users);
    });

    socket.on('leave:room', (roomId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user:left', { userId, name });
    });

    // ─── Chat ──────────────────────────────────────────────────────
    socket.on('message:send', async (data: { roomId: string; text: string }) => {
      const message = await MessageService.create({
        roomId: data.roomId, userId, text: data.text,
      });
      // Broadcast to everyone in room (including sender)
      io.to(data.roomId).emit('message:new', message);
    });

    // ─── Typing indicator ─────────────────────────────────────────
    socket.on('typing:start', ({ roomId }) =>
      socket.to(roomId).emit('typing:user', { userId, name, isTyping: true })
    );
    socket.on('typing:stop', ({ roomId }) =>
      socket.to(roomId).emit('typing:user', { userId, name, isTyping: false })
    );

    // ─── Disconnect ────────────────────────────────────────────────
    socket.on('disconnect', () => {
      // Notify all rooms this socket was in
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          io.to(room).emit('user:left', { userId, name });
        }
      });
    });
  });

  // Expose emit helpers for other services
  return {
    httpServer,
    emitToUser:  (userId: string, event: string, data: any) =>
      io.to(`user:${userId}`).emit(event, data),
    emitToRoom:  (roomId: string, event: string, data: any) =>
      io.to(roomId).emit(event, data),
    emitToAll:   (event: string, data: any) => io.emit(event, data),
  };
}
```

---

## React: Socket Connection Hook

```typescript
// hooks/useSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/useAuthStore';

let socket: Socket | null = null;

export function useSocket() {
  const { accessToken } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    // Singleton connection
    if (!socket || !socket.connected) {
      socket = io(process.env.VITE_WS_URL!, {
        auth: { token: accessToken },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });
    }
    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    return () => {
      // Don't disconnect — singleton persists across components
    };
  }, [accessToken]);

  const on = useCallback(<T>(event: string, handler: (data: T) => void) => {
    socket?.on(event, handler);
    return () => { socket?.off(event, handler); };
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socket?.emit(event, data);
  }, []);

  return { socket: socketRef.current, on, emit, connected: socket?.connected };
}
```

---

## React: Real-Time Chat Hook

```typescript
// hooks/useChat.ts
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';

export function useChat(roomId: string) {
  const qc = useQueryClient();
  const { on, emit } = useSocket();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Load initial messages from REST API
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', roomId],
    queryFn: () => messagesApi.getRoom(roomId),
  });

  useEffect(() => {
    emit('join:room', roomId);

    // Listen for new messages → append to cache
    const unsub1 = on<Message>('message:new', (msg) => {
      qc.setQueryData(['messages', roomId], (old: Message[] = []) => [...old, msg]);
    });

    const unsub2 = on<{ name: string; isTyping: boolean }>('typing:user', ({ name, isTyping }) => {
      setTypingUsers(prev =>
        isTyping ? [...new Set([...prev, name])] : prev.filter(n => n !== name)
      );
    });

    return () => {
      emit('leave:room', roomId);
      unsub1();
      unsub2();
    };
  }, [roomId]);

  const sendMessage = useCallback((text: string) => {
    emit('message:send', { roomId, text });
  }, [roomId, emit]);

  const startTyping = useCallback(() => emit('typing:start', { roomId }), [roomId]);
  const stopTyping  = useCallback(() => emit('typing:stop',  { roomId }), [roomId]);

  return { messages, typingUsers, sendMessage, startTyping, stopTyping };
}
```

---

## Server-Sent Events (SSE) — for notifications/feeds

```typescript
// server/routes/events.ts
router.get('/events', authenticate, (req: AuthRequest, res) => {
  res.writeHead(200, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',  // disable nginx buffering
  });

  const userId = req.user!.id;
  const clientId = `${userId}-${Date.now()}`;

  // Register client
  sseClients.set(clientId, res);

  // Send initial heartbeat
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

  // Heartbeat to prevent timeout
  const heartbeat = setInterval(() => res.write(':heartbeat\n\n'), 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
  });
});

// Push notification to user
export function pushToUser(userId: string, event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((res, clientId) => {
    if (clientId.startsWith(userId)) res.write(payload);
  });
}
```

```typescript
// hooks/useSSE.ts
export function useSSE(url: string) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const es = new EventSource(url, { withCredentials: true });

    es.addEventListener('notification', (e) => {
      setEvents(prev => [JSON.parse(e.data), ...prev]);
    });

    es.onerror = () => es.close();

    return () => es.close();
  }, [url]);

  return events;
}
```

---

## Production Checklist

- [ ] Auth on socket connection (JWT in handshake)
- [ ] Rate limiting on emit events (prevent spam)
- [ ] Room validation (user can only join authorized rooms)
- [ ] Graceful reconnect with exponential backoff
- [ ] Cleanup: leave rooms and remove listeners on unmount
- [ ] Heartbeat to prevent connection timeout behind proxies
- [ ] Handle `connect_error` gracefully — don't crash app
- [ ] Scale: Redis adapter for multi-instance deployment
