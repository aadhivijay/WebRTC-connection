//@ts-check
let socketConn = io('/');
const myPeer = new Peer(undefined, {
    host: '/',
    path: '/peer',
    port: 3001
});
let userId;
let roomId;
let localStream;
let peerList = {};

let initialCard;
let playCard;

let createBtn;

let joinInput;
let joinBtn;

let createInput;
let videoCard;

let leaveBtn;

window.onload = () => {
    initializePage();
}

myPeer.on('open', (id) => {
    userId = id;
    console.log(`User Id: ${userId}`);
});

myPeer.on('call', (call) => {
    console.log(`Call from ${call.peer}`);
    call.answer(localStream);
    const video = document.createElement('video');
    call.on('stream', (userVideoStream) => {
        addVideo(video, userVideoStream, true);
    });
    call.on('close', () => {
        video.remove();
    });
    peerList[call.peer] = {
        peer: call,
        video
    };
});

function initializePage() {
    initialCard = document.getElementById('initialCard');
    playCard = document.getElementById('playCard');

    createInput = document.getElementById('createInput');
    createBtn = document.getElementById('createBtn');
    createBtn.onclick = () => createRoom();

    joinInput = document.getElementById('joinInput');
    joinBtn = document.getElementById('joinBtn');
    joinBtn.onclick = () => joinRoom();

    videoCard = document.getElementById('videoCard');

    leaveBtn = document.getElementById('leaveBtn');
    leaveBtn.onclick = () => leaveRoom();

    socketConn.on('room-id', (id) => {
        roomId = id;
        console.log(`Created room ${roomId}`);
        createInput.value = roomId;
        sendMsg('join-room', roomId, userId);
    });

    socketConn.on('user-connected', (uId) => {
        console.log(`New user ${uId} connected!`);
        const call = myPeer.call(uId, localStream);
        const video = document.createElement('video');
        call.on('stream', (userVideoStream) => {
            addVideo(video, userVideoStream, true);
        });
        call.on('close', () => {
            video.remove();
        });

        peerList[uId] = {
            peer: call,
            video
        };
    });

    socketConn.on('user-disconnected', (uId) => {
        if (peerList[uId]) {
            console.log(`User disconnected ${uId}!`);
            peerList[uId].peer.close();
            peerList[uId].video.remove();
        }
    });

    toggleCard('initial');
}

function sendMsg(type, ...message) {
    socketConn.emit(type, ...message);
}

function getCameraMedia() {
    return new Promise((resolve, reject) => {
        let option = {
            audio: true,
            video: true
        };
        navigator.getUserMedia(
            option,
            (stream) => {
                resolve(stream);
            },
            (err) => {
                reject(err);
            }
        );
    });
}

function addVideo(video, stream, mute) {
    if (screen.width > 768) {
        video.width = 250;
        video.height = 188;
    } else {
        video.style.width = '100%';
        video.style.height = 'auto';
    }
    video.srcObject = stream;
    videoCard.appendChild(video);
    video.muted = mute;
    video.autoplay = true;
}

function toggleCard(card) {
    if (card === 'initial') {
        initialCard.style.visibility = 'unset';
        playCard.style.visibility = 'hidden';
        initialCard.style.height = 'auto';
        playCard.style.height = '0';
    } else {
        playCard.style.visibility = 'unset';
        initialCard.style.visibility = 'hidden';
        playCard.style.height = 'auto';
        initialCard.style.height = '0';
    }
}

function createRoom() {
    getCameraMedia().then((stream) => {
        localStream = stream;
        const video = document.createElement('video');
        addVideo(video, localStream, true);
        sendMsg('create-room', userId);
        toggleCard('play');
    }).catch((err) => {
        console.error(err);
        alert(err);
    });
}

function joinRoom() {
    roomId = joinInput.value;
    if (roomId) {
        getCameraMedia().then((stream) => {
            localStream = stream;
            const video = document.createElement('video');
            addVideo(video, localStream, true);
            sendMsg('join-room', roomId, userId);
            toggleCard('play');
        }).catch((err) => {
            console.error(err);
        });
    }
}

function leaveRoom() {
    if (localStream) {
        localStream.getTracks().forEach((track) => {
            track.stop();
        });
    }
    videoCard.childNodes.forEach((child) => {
        child.remove();
    });
    toggleCard('initial');
    sendMsg('leave-room', userId);
    roomId = undefined;
    peerList = {};
    createInput.value = '';
    joinInput.value = '';
}
