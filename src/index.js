const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Store active users with both userId and socketId
const activeUsers = new Map();

io.on('connection', (socket) => {
    console.log('🟢 User connected:', socket.id);

    socket.on('register', (userId) => {
        console.log('📝 User registered:', userId, 'Socket ID:', socket.id);
        activeUsers.set(socket.id, { userId, socketId: socket.id });

        // Send updated user list to all clients
        const userList = Array.from(activeUsers.values());
        io.emit('active-users', userList);

        console.log('👥 Active users:', userList);
    });

    socket.on('call-user', ({ to, offer }) => {
        console.log('📞 Call initiated from', socket.id, 'to', to);

        if (io.sockets.sockets.has(to)) {
            console.log('✅ Target user found, forwarding call');
            io.to(to).emit('call-received', {
                from: socket.id,
                offer
            });
        } else {
            console.log('❌ Target user not found:', to);
            socket.emit('call-failed', { error: 'User not found' });
        }
    });

    socket.on('call-accepted', ({ to, answer }) => {
        console.log('✅ Call accepted by', socket.id, 'for', to);
        io.to(to).emit('call-accepted', {
            from: socket.id,
            answer
        });
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
        console.log('🧊 ICE candidate from', socket.id, 'to', to);
        io.to(to).emit('ice-candidate', {
            from: socket.id,
            candidate
        });
    });

    socket.on('disconnect', () => {
        console.log('🔴 User disconnected:', socket.id);
        activeUsers.delete(socket.id);

        // Send updated user list to all clients
        const userList = Array.from(activeUsers.values());
        io.emit('active-users', userList);

        console.log('👥 Remaining active users:', userList);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});