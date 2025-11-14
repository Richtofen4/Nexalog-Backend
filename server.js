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

db.sequelize.sync().then(() => {
    console.log('Database synchronized');
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

io.on("connection", (socket) => {
  console.log('Socket connected:', socket.id);

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
    socket.join(`user:${uid}`);
    console.log(`[socket] ${socket.id} join user:${uid}`);
  });

  socket.on('user:leave', (uid) => {
    uid = Number(uid);
    if (!Number.isFinite(uid)) return;
    socket.leave(`user:${uid}`);
    console.log(`[socket] ${socket.id} leave user:${uid}`);
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

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
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

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});