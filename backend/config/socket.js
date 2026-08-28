let io = null;

function setIO(socketIO) {
  io = socketIO;
}

function getIO() {
  return io;
}

function emitOrderUpdate(orderId, order) {
  if (io) {
    io.to(`order:${orderId}`).emit('orderUpdate', order);
  }
}

// Broadcast to ALL connected clients (used for admin bell notifications)
function emitNewOrder(order) {
  if (io) {
    io.emit('newOrder', order);
  }
}

module.exports = { setIO, getIO, emitOrderUpdate, emitNewOrder };
