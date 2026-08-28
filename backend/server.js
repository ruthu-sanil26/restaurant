require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const { setIO } = require('./config/socket');
const { startReservationJob } = require('./utils/reservationJob');

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const menuRoutes = require('./routes/menuRoutes');
const tableRoutes = require('./routes/tableRoutes');
const orderRoutes = require('./routes/orderRoutes');
const aiAgentRoutes = require('./routes/aiAgentRoutes');
const publicRoutes = require('./routes/publicRoutes');
const reservationRoutes = require('./routes/reservationRoutes');

connectDB().then(() => {
  startReservationJob();
});

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: true },
  path: '/socket.io',
});
setIO(io);

io.on('connection', (socket) => {
  socket.on('joinOrder', (orderId) => {
    if (orderId) socket.join(`order:${orderId}`);
  });
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ai', aiAgentRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/reservations', reservationRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
const os = require('os');
const getLocalIP = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
};

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`\n🚀 Server running:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${localIP}:${PORT}  ← use this for phone access\n`);
});
