//@ts-check
const EXPRESS = require('express');
const uuid = require('uuid');
const PORT = 3000;

const app = EXPRESS();

app.use(EXPRESS.static(__dirname + '/webpage'));

const server = app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}!`);
});

const IO = require('socket.io')(server);

IO.use((socket, next) => {
    const token = socket.handshake.query.token || socket.handshake.headers.token;
    if (token === 'token') {
        next();
    } else {
        next(new Error('token invalid'));
    }
});

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
        IO.to(roomId).clients((err, clients) => {
            socket.emit('joined-room', clients);
        });

        // ice candidate handle
        socket.on('ice-candidate', (iceCandidate) => {
            socket.to(roomId).broadcast.emit('ice-candidate', iceCandidate);
        });

        // offer handle
        socket.on('offer', (offer, uId) => {
            IO.to(uId).emit('offer', offer);
        });

        // answer handle
        socket.on('answer', (answer, uId) => {
            IO.to(uId).emit('answer', answer);
        });

        const userDisconnect = () => {
            console.log(`${userId} disconnected from room ${roomId}!`);
            socket.to(roomId).broadcast.emit('user-disconnected', userId);
        };
        socket.on('disconnect', () => userDisconnect());
        socket.on('leave-room', () => userDisconnect());
    });
});
