const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');

const app = express();

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
/* LOKALNIE
//CORS
const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'x-access-token', 'Authorization', 'Accept', 'Origin'],
};
app.use(cors(corsOptions));
*/

//GLOBALNIE
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'x-access-token', 'Authorization', 'Accept', 'Origin'],
  credentials: true,
};
app.use(cors(corsOptions));


//Swagger
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

//Database
const db = require('./app/models');
const notificationService = require("./app/services/notification.service");

db.sequelize.sync().then(() => {
  console.log('Database synchronized');

  notificationService
    .cleanupOldNotifications()
    .catch(err => console.error("Initial notifications cleanup error:", err.message));

  setInterval(() => {
    notificationService
      .cleanupOldNotifications()
      .catch(err => console.error("Periodic notifications cleanup error:", err.message));
  }, 60 * 60 * 1000);
});

// Socker.io
const server = http.createServer(app);
//LOKALNIE
/*
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
*/
//GLOBALNIE
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.locals.io = io;

const onlineUsers = new Map();

app.locals.isUserOnline = (id) => {
  id = Number(id);
  if (!Number.isFinite(id)) return false;
  return onlineUsers.has(id);
};

app.locals.getOnlineUsers = () => Array.from(onlineUsers.keys());

io.on("connection", (socket) => {
  console.log('Socket connected:', socket.id);

  socket.data.userId = null;

  const parseConvId = (payload) => {
    if (payload && typeof payload === 'object') payload = payload.conversationId;
    const id = Number(payload);
    return Number.isFinite(id) ? id : null;
  };

  const join = (payload) => {
    const id = parseConvId(payload);
    if (id == null) return;
    socket.join(`conv:${id}`);
    console.log(`[socket] ${socket.id} join conv:${id}`);
  };

  const leave = (payload) => {
    const id = parseConvId(payload);
    if (id == null) return;
    socket.leave(`conv:${id}`);
    console.log(`[socket] ${socket.id} leave conv:${id}`);
  };

  socket.on('user:join', (uid) => {
    uid = Number(uid);
    if (!Number.isFinite(uid)) return;

    socket.data.userId = uid;

    const prev = onlineUsers.get(uid) || 0;
    onlineUsers.set(uid, prev + 1);

    socket.join(`user:${uid}`);
    console.log(`[socket] ${socket.id} join user:${uid}, count=${onlineUsers.get(uid)}`);

    socket.broadcast.emit("presence:online", { userId: uid });
  });

  function handleUserLeave() {
    const uid = Number(socket.data.userId);
    if (!Number.isFinite(uid)) return;

    const prev = onlineUsers.get(uid) || 0;
    const next = prev - 1;

    if (next <= 0) {
      onlineUsers.delete(uid);
      console.log(`[socket] user ${uid} is now OFFLINE`);

      io.emit("presence:offline", { userId: uid });
    } else {
      onlineUsers.set(uid, next);
      console.log(`[socket] user ${uid} decreased sockets, count=${next}`);
    }

    socket.leave(`user:${uid}`);
    console.log(`[socket] ${socket.id} leave user:${uid}`);
    socket.data.userId = null;
  }

  socket.on('user:leave', handleUserLeave);

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
    handleUserLeave();
  });

  socket.on("channel:join", (id) => {
    id = Number(id);
    if (!Number.isFinite(id)) return;
    socket.join(`chan:${id}`);
    console.log(`[socket] ${socket.id} join chan:${id}`);
  });

  socket.on("channel:leave", (id) => {
    id = Number(id);
    if (!Number.isFinite(id)) return;
    socket.leave(`chan:${id}`);
    console.log(`[socket] ${socket.id} leave chan:${id}`);
  });

  socket.on('conv:join', join);
  socket.on('conversation:join', join);

  socket.on('conv:leave', leave);
  socket.on('conversation:leave', leave);
});

//routes
require('./app/routes/auth.routes.js')(app);
require('./app/routes/user.routes.js')(app);
require('./app/routes/friend.routes.js')(app);
require('./app/routes/server.routes.js')(app);
require('./app/routes/server_members.routes.js')(app);
require('./app/routes/channel.routes.js')(app);
require('./app/routes/private_chat.routes.js')(app);
require('./app/routes/channel_message.routes.js')(app);
require('./app/routes/notification.routes.js')(app);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});