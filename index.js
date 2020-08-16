//@ts-check
const EXPRESS = require('express');
const uuid = require('uuid');
const PORT = 3000;

const app = EXPRESS();

const { PeerServer } = require('peer');
const peerServer = PeerServer({
    port: 3001,
    path: '/peer'
});

app.use(EXPRESS.static(__dirname + '/webpage'));

const server = app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}!`);
});

const IO = require('socket.io')(server);

IO.on('connection', (socket) => {
    console.log(`${socket.id} Connected!`);
    socket.on('create-room', (userId) => {
        const roomId = uuid.v4();
        socket.emit('room-id', roomId);
        console.log(`${userId} created a room ${roomId}!`);
    });
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        console.log(`${userId} joined room ${roomId}!`);
        socket.to(roomId).broadcast.emit('user-connected', userId);
        const userDisconnect = () => {
            console.log(`${userId} disconnected from room ${roomId}!`);
            socket.to(roomId).broadcast.emit('user-disconnected', userId);
        };
        socket.on('disconnect', () => userDisconnect());
        socket.on('leave-room', () => userDisconnect());
    });
});
