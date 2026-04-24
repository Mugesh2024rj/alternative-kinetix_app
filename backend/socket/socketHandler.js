const socketHandler = (io) => {
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('authenticate', (userId) => {
      connectedUsers.set(userId, socket.id);
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined room user_${userId}`);
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          break;
        }
      }
      console.log('Socket disconnected:', socket.id);
    });

    socket.on('join_room', (room) => {
      socket.join(room);
    });

    socket.on('leave_room', (room) => {
      socket.leave(room);
    });
  });

  return { connectedUsers };
};

module.exports = socketHandler;
