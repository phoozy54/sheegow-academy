import { createServer } from 'http'
import { createHmac, timingSafeEqual } from 'crypto'
import { Server } from 'socket.io'

// ============================================================================
// SHEEGOW ACADEMY - Live Class Chat + WebRTC Signaling Service
// Real-time chat and camera/microphone signaling for live English classes.
// Each live class is a "room" identified by its classId.
//
// SECURITY: every client must present a short-lived, class-scoped token issued
// by the Next.js app (/api/socket/token). Identity, class and broadcast rights
// are derived from that token — never from client-supplied event payloads.
// ============================================================================

const PORT = Number(process.env.PORT) || 3003

// Render sets NODE_ENV=production. Local/sandbox runs stay in dev mode even
// when a different PORT is used for testing.
const isProduction =
  process.env.NODE_ENV === 'production' ||
  (process.env.PORT !== undefined &&
    process.env.PORT !== '3003' &&
    process.env.NODE_ENV !== 'development')

// Must match JWT_SECRET in the Next.js app. Fail closed in production.
const JWT_SECRET = process.env.JWT_SECRET?.trim() || ''

const APP_ORIGINS = [
  'https://sheegowacademy.com',
  'https://www.sheegowacademy.com',
  ...(process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
]

// ----------------------------------------------------------------------------
// Token verification (HS256, no extra dependency)
// ----------------------------------------------------------------------------
interface SocketIdentity {
  userId: string
  userName: string
  role: string
  classId: string
  canBroadcast: boolean
  canShareScreen: boolean
}

function verifySocketToken(token: unknown): SocketIdentity | null {
  if (!JWT_SECRET || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [headerB64, payloadB64, signatureB64] = parts
  try {
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString())
    if (header.alg !== 'HS256') return null

    const expected = createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest()
    const provided = Buffer.from(signatureB64, 'base64url')
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      return null
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())
    if (payload.purpose !== 'socket') return null
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null
    if (!payload.userId || !payload.userName || !payload.classId) return null

    return {
      userId: String(payload.userId),
      userName: String(payload.userName),
      role: String(payload.role || 'student'),
      classId: String(payload.classId),
      canBroadcast: payload.canBroadcast === true,
      canShareScreen: payload.canShareScreen === true,
    }
  } catch {
    return null
  }
}

if (isProduction && !JWT_SECRET) {
  console.error('[security] JWT_SECRET is not set — signaling connections will be rejected')
}

const httpServer = createServer((req, res) => {
  if (!isProduction) {
    res.writeHead(404)
    res.end('Not Found')
    return
  }
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
  ...(isProduction ? {} : { path: '/' }),
  cors: {
    origin: isProduction ? APP_ORIGINS : true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Authenticate the handshake. In local dev (no JWT_SECRET configured on the
// chat service) anonymous sockets are allowed so developers can still test.
io.use((socket, next) => {
  if (!isProduction && !JWT_SECRET) {
    socket.data.identity = null
    next()
    return
  }
  const identity = verifySocketToken(socket.handshake.auth?.token)
  if (!identity) {
    next(new Error('unauthorized'))
    return
  }
  socket.data.identity = identity
  next()
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
  /** Client-generated id so the sender can dedupe its own socket echo. */
  clientId?: string
}

interface JoinClassPayload {
  classId: string
  userId?: string
  userName?: string
  userAvatar?: string
}

interface SendMessagePayload {
  classId: string
  text: string
  clientId?: string
}

interface ClassStatusPayload {
  classId: string
}

interface RtcSignalPayload {
  toUserId: string
  sdp?: { type: string; sdp?: string }
  candidate?: {
    candidate: string
    sdpMid?: string | null
    sdpMLineIndex?: number | null
    usernameFragment?: string | null
  }
}

// ----------------------------------------------------------------------------
// In-memory tracking
// ----------------------------------------------------------------------------
const classUsers = new Map<string, Set<OnlineUser>>()
const socketIndex = new Map<string, { classId: string; user: OnlineUser }>()
const classHosts = new Map<string, { socketId: string; userId: string; userName: string }>()
/** Classes where the active host is currently sharing a screen. */
const screenShareClasses = new Set<string>()

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** Small in-process rate limiter (per socket, per event). */
const eventHits = new Map<string, number[]>()
function allowEvent(socketId: string, event: string, max: number, windowMs: number) {
  const key = `${socketId}:${event}`
  const now = Date.now()
  const hits = (eventHits.get(key) || []).filter((t) => now - t < windowMs)
  if (hits.length >= max) {
    eventHits.set(key, hits)
    return false
  }
  hits.push(now)
  eventHits.set(key, hits)
  return true
}

function payloadTooLarge(payload: unknown): boolean {
  try {
    return JSON.stringify(payload || {}).length > 80_000
  } catch {
    return true
  }
}

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
  io.to(classId).emit('online-count', { classId, onlineCount: users ? users.size : 0 })
}

const findSocketId = (classId: string, userId: string): string | undefined => {
  const users = classUsers.get(classId)
  return users ? Array.from(users).find((u) => u.userId === userId)?.socketId : undefined
}

const stopHost = (classId: string) => {
  const host = classHosts.get(classId)
  if (!host) return
  classHosts.delete(classId)
  if (screenShareClasses.delete(classId)) {
    io.to(classId).emit('screen-share-stopped', { classId, hostUserId: host.userId })
  }
  io.to(classId).emit('broadcast-stopped', { classId, hostUserId: host.userId })
  if (process.env.LOG_LEVEL !== 'quiet') {
    console.log(`[rtc] broadcast stopped: ${host.userName} in ${classId}`)
  }
}

/** Identity from the verified token, or a dev-only fallback. */
const identityOf = (socket: any): SocketIdentity => {
  if (socket.data.identity) return socket.data.identity as SocketIdentity
  // Local development only — auth middleware guarantees this is never used
  // in production.
  return {
    userId: 'dev-user',
    userName: 'Dev User',
    role: 'teacher',
    classId: '',
    canBroadcast: true,
    canShareScreen: true,
  }
}

/** Every state-changing event must come from a socket that joined THIS class. */
const membership = (socket: any, classId: string) => {
  const entry = socketIndex.get(socket.id)
  if (!entry || entry.classId !== classId) {
    socket.emit('error', { message: 'Join the class first' })
    return null
  }
  return entry
}

// ----------------------------------------------------------------------------
// Connection handling
// ----------------------------------------------------------------------------
io.on('connection', (socket) => {
  const identity = identityOf(socket)
  if (process.env.LOG_LEVEL !== 'quiet') {
    console.log(`[chat] connect: ${socket.id} (${identity.userName})`)
  }

  // ------------------------------------------------------------------
  // join-class
  // ------------------------------------------------------------------
  socket.on('join-class', (payload: JoinClassPayload) => {
    if (payloadTooLarge(payload) || !payload?.classId) return

    // In production the token is class-scoped — a token for room A cannot be
    // used to join room B.
    if (isProduction && identity.classId && identity.classId !== payload.classId) {
      socket.emit('error', { message: 'This token is for a different class' })
      return
    }
    if (!allowEvent(socket.id, 'join', 10, 10_000)) return

    // Leave any previous class this socket was in.
    const previous = socketIndex.get(socket.id)
    if (previous) {
      if (classHosts.get(previous.classId)?.socketId === socket.id) {
        stopHost(previous.classId)
      }
      const prevSet = classUsers.get(previous.classId)
      if (prevSet) {
        prevSet.delete(previous.user)
        if (prevSet.size === 0) classUsers.delete(previous.classId)
        io.to(previous.classId).emit('user-left', {
          userId: previous.user.userId,
          userName: previous.user.userName,
          onlineCount: prevSet.size,
        })
        broadcastOnlineCount(previous.classId)
      }
      socket.leave(previous.classId)
    }

    // Identity is server-controlled. Dev fallback uses the client values only
    // because there is no token in local development.
    const devFallback = !isProduction && !socket.data.identity
    const user: OnlineUser = {
      socketId: socket.id,
      userId: devFallback && payload.userId ? payload.userId : identity.userId,
      userName: devFallback && payload.userName ? payload.userName : identity.userName,
      userAvatar: devFallback ? payload.userAvatar : undefined,
    }

    socket.join(payload.classId)
    const users = getUsersInClass(payload.classId)
    users.add(user)
    socketIndex.set(socket.id, { classId: payload.classId, user })

    const onlineCount = users.size
    io.to(payload.classId).emit('user-joined', {
      userId: user.userId,
      userName: user.userName,
      onlineCount,
    })
    io.to(payload.classId).emit('online-count', { classId: payload.classId, onlineCount })
    socket.emit('users-list', {
      classId: payload.classId,
      users: Array.from(users).map((u) => ({
        userId: u.userId,
        userName: u.userName,
        userAvatar: u.userAvatar,
      })),
      onlineCount,
    })

    const host = classHosts.get(payload.classId)
    if (host && host.userId !== user.userId) {
      socket.emit('broadcast-started', { classId: payload.classId, hostUserId: host.userId })
      io.to(host.socketId).emit('viewer-joined', {
        classId: payload.classId,
        userId: user.userId,
        userName: user.userName,
      })
    }
  })

  // ------------------------------------------------------------------
  // send-message — membership + identity + rate/size limits
  // ------------------------------------------------------------------
  socket.on('send-message', (payload: SendMessagePayload) => {
    if (payloadTooLarge(payload) || !payload?.classId) return
    const entry = membership(socket, payload.classId)
    if (!entry) return
    if (!allowEvent(socket.id, 'message', 20, 10_000)) return

    const text = typeof payload.text === 'string' ? payload.text.trim().slice(0, 500) : ''
    if (!text) return

    const message: ChatMessage = {
      id: generateId(),
      classId: entry.classId,
      userId: entry.user.userId,
      userName: entry.user.userName,
      userAvatar: entry.user.userAvatar,
      text,
      timestamp: new Date().toISOString(),
      ...(typeof payload.clientId === 'string' && payload.clientId.length <= 80
        ? { clientId: payload.clientId }
        : {}),
    }
    io.to(entry.classId).emit('new-message', message)
  })

  // ------------------------------------------------------------------
  // raise-hand
  // ------------------------------------------------------------------
  socket.on('raise-hand', (payload: { classId: string }) => {
    if (!payload?.classId) return
    const entry = membership(socket, payload.classId)
    if (!entry) return
    if (!allowEvent(socket.id, 'hand', 2, 10_000)) return
    io.to(entry.classId).emit('hand-raised', {
      userId: entry.user.userId,
      userName: entry.user.userName,
    })
  })

  // ------------------------------------------------------------------
  // start-class / end-class — teacher/admin only
  // ------------------------------------------------------------------
  const handleClassStatus = (status: 'live' | 'ended') => {
    return (payload: ClassStatusPayload) => {
      if (!payload?.classId) return
      const entry = membership(socket, payload.classId)
      if (!entry) return
      if (!identity.canBroadcast) {
        socket.emit('error', { message: 'Only the teacher can change class status' })
        return
      }
      if (!allowEvent(socket.id, 'status', 6, 60_000)) return
      io.to(entry.classId).emit('class-status', { classId: entry.classId, status })
    }
  }
  socket.on('start-class', handleClassStatus('live'))
  socket.on('end-class', handleClassStatus('ended'))

  // ------------------------------------------------------------------
  // WebRTC signaling — real camera/microphone broadcast
  // ------------------------------------------------------------------
  socket.on('broadcast-start', (payload: { classId: string }) => {
    if (!payload?.classId) return
    const entry = membership(socket, payload.classId)
    if (!entry) return
    if (!identity.canBroadcast) {
      socket.emit('broadcast-denied', {
        message: 'Only the assigned teacher or an administrator can share camera and microphone',
      })
      return
    }

    const existing = classHosts.get(entry.classId)
    if (existing && existing.socketId !== socket.id) {
      socket.emit('broadcast-denied', {
        message: `${existing.userName} is already sharing their camera and microphone`,
      })
      return
    }

    if (!existing) {
      classHosts.set(entry.classId, {
        socketId: socket.id,
        userId: entry.user.userId,
        userName: entry.user.userName,
      })
      io.to(entry.classId).emit('broadcast-started', {
        classId: entry.classId,
        hostUserId: entry.user.userId,
        hostUserName: entry.user.userName,
      })
      const users = classUsers.get(entry.classId)
      users?.forEach((u) => {
        if (u.userId !== entry.user.userId) {
          io.to(socket.id).emit('viewer-joined', {
            classId: entry.classId,
            userId: u.userId,
            userName: u.userName,
          })
        }
      })
      if (process.env.LOG_LEVEL !== 'quiet') {
        console.log(`[rtc] broadcast started: ${entry.user.userName} in ${entry.classId}`)
      }
    }
  })

  socket.on('broadcast-stop', (payload: { classId: string }) => {
    const host = classHosts.get(payload?.classId)
    if (!host || host.socketId !== socket.id) return
    stopHost(payload.classId)
  })

  // ------------------------------------------------------------------
  // Screen sharing — host-only capability from the signed socket token.
  // It reuses the active WebRTC broadcast; viewers only get a UI update.
  // ------------------------------------------------------------------
  socket.on('screen-share-start', (payload: { classId: string }) => {
    if (!payload?.classId) return
    const entry = membership(socket, payload.classId)
    if (!entry) return
    if (!identity.canShareScreen) {
      socket.emit('error', { message: 'Screen sharing is only available to the teacher' })
      return
    }
    const host = classHosts.get(entry.classId)
    if (!host || host.socketId !== socket.id) {
      socket.emit('error', { message: 'Start your camera broadcast before sharing your screen' })
      return
    }
    if (!allowEvent(socket.id, 'screen-share', 10, 60_000)) return
    screenShareClasses.add(entry.classId)
    io.to(entry.classId).emit('screen-share-started', {
      classId: entry.classId,
      hostUserId: entry.user.userId,
    })
  })

  socket.on('screen-share-stop', (payload: { classId: string }) => {
    if (!payload?.classId) return
    const entry = membership(socket, payload.classId)
    if (!entry) return
    const host = classHosts.get(entry.classId)
    if (!host || host.socketId !== socket.id || !screenShareClasses.has(entry.classId)) return
    screenShareClasses.delete(entry.classId)
    io.to(entry.classId).emit('screen-share-stopped', {
      classId: entry.classId,
      hostUserId: entry.user.userId,
    })
  })

  /** Relay SDP offers/answers and ICE candidates point-to-point, with limits. */
  const relaySignal = (event: 'webrtc-offer' | 'webrtc-answer' | 'webrtc-ice') => {
    return (payload: RtcSignalPayload) => {
      if (payloadTooLarge(payload) || !payload?.toUserId) return
      const entry = socketIndex.get(socket.id)
      if (!entry) return
      if (!allowEvent(socket.id, event, 200, 10_000)) return

      // Signaling is only valid for the ACTIVE host session in THIS class.
      // A viewer cannot inject offers or impersonate the teacher.
      const host = classHosts.get(entry.classId)
      if (!host) return
      const senderIsHost = host.socketId === socket.id
      const targetIsHost = host.userId === payload.toUserId
      if (event === 'webrtc-offer' && (!senderIsHost || targetIsHost)) return
      if (event === 'webrtc-answer' && (senderIsHost || !targetIsHost)) return
      if (event === 'webrtc-ice' && senderIsHost === targetIsHost) return

      const sdp = payload.sdp
      if (sdp) {
        if (typeof sdp.type !== 'string' || sdp.type.length > 8) return
        if (typeof sdp.sdp === 'string' && sdp.sdp.length > 60_000) return
      }
      const candidate = payload.candidate
      if (candidate) {
        if (typeof candidate.candidate !== 'string' || candidate.candidate.length > 2_000) return
      }
      if (!sdp && !candidate) return

      const targetSocketId = findSocketId(entry.classId, payload.toUserId)
      if (!targetSocketId) return
      io.to(targetSocketId).emit(event, {
        ...(sdp ? { sdp } : {}),
        ...(candidate ? { candidate } : {}),
        fromUserId: entry.user.userId,
      })
    }
  }
  socket.on('webrtc-offer', relaySignal('webrtc-offer'))
  socket.on('webrtc-answer', relaySignal('webrtc-answer'))
  socket.on('webrtc-ice', relaySignal('webrtc-ice'))

  // ------------------------------------------------------------------
  // disconnect
  // ------------------------------------------------------------------
  socket.on('disconnect', () => {
    eventHits.forEach((_v, key) => {
      if (key.startsWith(`${socket.id}:`)) eventHits.delete(key)
    })
    const entry = socketIndex.get(socket.id)
    if (!entry) return

    const { classId, user } = entry
    if (classHosts.get(classId)?.socketId === socket.id) stopHost(classId)
    const users = classUsers.get(classId)
    if (users) {
      users.delete(user)
      if (users.size === 0) classUsers.delete(classId)
    }
    socketIndex.delete(socket.id)
    io.to(classId).emit('user-left', {
      userId: user.userId,
      userName: user.userName,
      onlineCount: users ? users.size : 0,
    })
    broadcastOnlineCount(classId)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[chat] service running on port ${PORT}${isProduction ? ' (production)' : ' (dev)'}`)
})
