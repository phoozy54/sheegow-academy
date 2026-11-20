import { createServer } from 'http'
import { Server } from 'socket.io'

// ============================================================================
// SHEEGOW ACADEMY - Live Class Chat Service
// Real-time chat over socket.io for live English classes.
// Each live class is a "room" identified by its classId.
// ============================================================================

// Read PORT from env (Render sets PORT=10000), fall back to 3003 for local dev.
// In the sandbox, Caddy forwards via XTransformPort so we keep 3003.
const PORT = Number(process.env.PORT) || 3003

// Detect production environment (Render/Heroku/etc.) where PORT is injected.
// In production we use the default socket.io path (/socket.io/) so the HTTP
// server can also serve a health-check page. In the sandbox we set path: '/'
// because Caddy uses it to route XTransformPort requests.
const isProduction = process.env.PORT !== undefined && process.env.PORT !== '3003'

const httpServer = createServer((req, res) => {
  // Only attach the HTTP handler in production — in the sandbox, Caddy
  // owns path '/' and socket.io needs it.
  if (!isProduction) {
    res.writeHead(404)
    res.end('Not Found')
    return
  }
  // Production: serve a friendly status page for browser/health-check visits
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      service: 'SHEEGOW ACADEMY Chat Service',
      status: 'online',
      uptime: Math.floor(process.uptime()),
      connections: io.engine.clientsCount,
      timestamp: new Date().toISOString(),
    }, null, 2))
    return
  }
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not Found' }))
})

const io = new Server(httpServer, {
  // Sandbox: path '/' (Caddy requirement). Production: default '/socket.io/'.
  ...(isProduction ? {} : { path: '/' }),
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface OnlineUser {
  socketId: string
  userId: string
  userName: string
  userAvatar?: string
}

interface ChatMessage {
  id: string
  classId: string
  userId: string
  userName: string
  userAvatar?: string
  text: string
  timestamp: string
}

interface JoinClassPayload {
  classId: string
  userId: string
  userName: string
  userAvatar?: string
}

interface SendMessagePayload {
  classId: string
  userId: string
  userName: string
  userAvatar?: string
  text: string
}

interface RaiseHandPayload {
  classId: string
  userId: string
  userName: string
}

interface ClassStatusPayload {
  classId: string
}

// ----------------------------------------------------------------------------
// In-memory tracking
// classId -> Set<OnlineUser>
// ----------------------------------------------------------------------------

const classUsers = new Map<string, Set<OnlineUser>>()

// Reverse lookup: socketId -> { classId, user } so we can clean up on disconnect.
const socketIndex = new Map<string, { classId: string; user: OnlineUser }>()

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const getUsersInClass = (classId: string): Set<OnlineUser> => {
  let set = classUsers.get(classId)
  if (!set) {
    set = new Set()
    classUsers.set(classId, set)
  }
  return set
}

const broadcastOnlineCount = (classId: string) => {
  const users = classUsers.get(classId)
  const count = users ? users.size : 0
  io.to(classId).emit('online-count', { classId, onlineCount: count })
}

// ----------------------------------------------------------------------------
// Connection handling
// ----------------------------------------------------------------------------

io.on('connection', (socket) => {
  if (process.env.LOG_LEVEL !== 'quiet') {
    console.log(`[chat] connect: ${socket.id}`)
  }

  // ------------------------------------------------------------------
  // join-class
  // ------------------------------------------------------------------
  socket.on('join-class', (payload: JoinClassPayload) => {
    const { classId, userId, userName, userAvatar } = payload
    if (!classId || !userId || !userName) {
      socket.emit('error', { message: 'join-class requires classId, userId, userName' })
      return
    }

    // Leave any previous class this socket was in (defensive — one socket per class)
    const previous = socketIndex.get(socket.id)
    if (previous) {
      const prevSet = classUsers.get(previous.classId)
      if (prevSet) {
        prevSet.delete(previous.user)
        if (prevSet.size === 0) classUsers.delete(previous.classId)
        io.to(previous.classId).emit('user-left', {
          userId: previous.user.userId,
          userName: previous.user.userName,
          onlineCount: prevSet ? prevSet.size : 0,
        })
        broadcastOnlineCount(previous.classId)
      }
      socket.leave(previous.classId)
    }

    const user: OnlineUser = {
      socketId: socket.id,
      userId,
      userName,
      userAvatar,
    }

    socket.join(classId)
    const users = getUsersInClass(classId)
    users.add(user)
    socketIndex.set(socket.id, { classId, user })

    const onlineCount = users.size

    // Notify everyone in the room (including the new joiner)
    io.to(classId).emit('user-joined', { userId, userName, onlineCount })

    // Updated count for the room
    io.to(classId).emit('online-count', { classId, onlineCount })

    // Send the current list of online users to the joining socket only
    socket.emit('users-list', {
      classId,
      users: Array.from(users).map((u) => ({
        userId: u.userId,
        userName: u.userName,
        userAvatar: u.userAvatar,
      })),
      onlineCount,
    })

    if (process.env.LOG_LEVEL !== 'quiet') {
      console.log(`[chat] join: ${userName} -> ${classId} (online: ${onlineCount})`)
    }
  })

  // ------------------------------------------------------------------
  // send-message
  // ------------------------------------------------------------------
  socket.on('send-message', (payload: SendMessagePayload) => {
    const { classId, userId, userName, userAvatar, text } = payload
    if (!classId || !userId || !userName || typeof text !== 'string') {
      socket.emit('error', {
        message: 'send-message requires classId, userId, userName, text',
      })
      return
    }

    const message: ChatMessage = {
      id: generateId(),
      classId,
      userId,
      userName,
      userAvatar,
      text,
      timestamp: new Date().toISOString(),
    }

    // Broadcast to everyone in the room, including the sender
    io.to(classId).emit('new-message', message)

    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[chat] msg in ${classId} from ${userName}`)
    }
  })

  // ------------------------------------------------------------------
  // raise-hand
  // ------------------------------------------------------------------
  socket.on('raise-hand', (payload: RaiseHandPayload) => {
    const { classId, userId, userName } = payload
    if (!classId || !userId || !userName) {
      socket.emit('error', {
        message: 'raise-hand requires classId, userId, userName',
      })
      return
    }

    io.to(classId).emit('hand-raised', { userId, userName })

    // raise-hand events are noisy — only log at debug level
  })

  // ------------------------------------------------------------------
  // start-class / end-class
  // ------------------------------------------------------------------
  const handleClassStatus = (status: 'live' | 'ended') => {
    return (payload: ClassStatusPayload) => {
      const { classId } = payload
      if (!classId) {
        socket.emit('error', { message: `${status}-class requires classId` })
        return
      }

      io.to(classId).emit('class-status', { classId, status })

      if (process.env.LOG_LEVEL !== 'quiet') {
        console.log(`[chat] class ${classId} -> ${status}`)
      }
    }
  }

  socket.on('start-class', handleClassStatus('live'))
  socket.on('end-class', handleClassStatus('ended'))

  // ------------------------------------------------------------------
  // disconnect
  // ------------------------------------------------------------------
  socket.on('disconnect', () => {
    const entry = socketIndex.get(socket.id)
    if (!entry) {
      if (process.env.LOG_LEVEL !== 'quiet') {
        console.log(`[chat] disconnect: ${socket.id} (no class)`)
      }
      return
    }

    const { classId, user } = entry
    const users = classUsers.get(classId)
    if (users) {
      users.delete(user)
      if (users.size === 0) {
        classUsers.delete(classId)
      }
    }

    socketIndex.delete(socket.id)

    const onlineCount = users ? users.size : 0

    // Notify the room the user left and the updated count
    io.to(classId).emit('user-left', {
      userId: user.userId,
      userName: user.userName,
      onlineCount,
    })
    broadcastOnlineCount(classId)

    if (process.env.LOG_LEVEL !== 'quiet') {
      console.log(`[chat] leave: ${user.userName} <- ${classId} (online: ${onlineCount})`)
    }
  })

  socket.on('error', (error: Error) => {
    console.error(`[chat] socket error (${socket.id}):`, error.message)
  })
})

// ----------------------------------------------------------------------------
// Boot
// ----------------------------------------------------------------------------

httpServer.listen(PORT, () => {
  console.log(`[chat] service running on port ${PORT}`)
})

// ----------------------------------------------------------------------------
// Graceful shutdown
// ----------------------------------------------------------------------------

const shutdown = (signal: string) => {
  console.log(`[chat] received ${signal}, shutting down...`)
  io.close(() => {
    httpServer.close(() => {
      console.log('[chat] server closed')
      process.exit(0)
    })
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
