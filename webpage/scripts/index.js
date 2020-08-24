//@ts-check
let socketConn = io({
    host: '/',
    query: {
        token: 'token'
    }
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

socketConn.on('error', (reason) => {
    console.log(reason);
});

socketConn.on('connect', () => {
    userId = socketConn.id;
    console.log(`USER ID : ${userId}`);
    initializePage();
    if (localStream) {
        localStream.getTracks().forEach((track) => {
            track.stop();
        });
    }
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

    socketConn.on('joined-room', async (clients) => {
        createInput.value = roomId;
        if (clients) {
            for (let i = 0; i < clients.length; i += 1) {
                const uId = clients[i];
                if (uId !== userId) {
                    peerList[uId] = createRTCPeer(uId);
                    console.log(`Creating offer to ${uId}!`);
                    const peerCon = peerList[uId].peerCon;
                    const offer = await peerCon.createOffer();
                    await peerCon.setLocalDescription(offer);
                    sendMsg('offer', { offer, userId }, uId);
                }
            }
        }
    });

    socketConn.on('offer', async (data) => {
        if (!peerList[data.userId]) {
            peerList[data.userId] = createRTCPeer(data.userId);
        }
        const peerCon = peerList[data.userId].peerCon;
        const remoteDesc = new RTCSessionDescription(data.offer);
        await peerCon.setRemoteDescription(remoteDesc);
        const answer = await peerCon.createAnswer();
        await peerCon.setLocalDescription(answer);
        sendMsg('answer', { answer, userId }, data.userId);
    });

    socketConn.on('answer', async (data) => {
        if (peerList[data.userId]) {
            const peerCon = peerList[data.userId].peerCon;
            const remoteDesc = new RTCSessionDescription(data.answer);
            await peerCon.setRemoteDescription(remoteDesc);
        }
    });

    socketConn.on('ice-candidate', async (data) => {
        if (peerList[data.userId]) {
            const peerCon = peerList[data.userId].peerCon;
            await peerCon.addIceCandidate(data.iceCandidate);
        }
    });

    socketConn.on('user-disconnected', (uId) => {
        if (peerList[uId]) {
            const video = peerList[uId].video;
            video.remove();
            const peerCon = peerList[uId].peerCon;
            peerCon.close();
            delete peerList[uId];
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

function addVideo(video, stream, mute, userId) {
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
    video.title = userId;
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

function createRTCPeer(uId) {
    const peerCon = new RTCPeerConnection({
        iceServers: [
            {
                urls: 'stun:stun.l.google.com:19302'
            },
            {
                urls: 'stun:stun1.l.google.com:19302'
            },
            {
                urls: 'stun:stun2.l.google.com:19302'
            },
            {
                urls: 'stun:stun.l.google.com:19302?transport=udp'
            }
        ]
    });

    peerCon.onicecandidate = (ev) => {
        if (ev.candidate) {
            sendMsg('ice-candidate', { iceCandidate: ev.candidate, userId });
        }
    };

    localStream.getTracks().forEach(track => {
        peerCon.addTrack(track, localStream);
    });

    let remoteStream = new MediaStream();
    let video = document.createElement('video');
    peerCon.ontrack = (ev) => {
        remoteStream.addTrack(ev.track);
    };
    addVideo(video, remoteStream, true, uId);
    peerCon.onconnectionstatechange = (ev) => {
        console.log(`${uId} connection state : ${peerCon.connectionState}`);
        if (peerCon.connectionState === 'disconnected') {
            video.remove();
        }
    };

    return {
        peerCon,
        video
    };
}

function createRoom() {
    getCameraMedia().then((stream) => {
        localStream = stream;
        const video = document.createElement('video');
        addVideo(video, localStream, true, userId);
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
        getCameraMedia().then(async (stream) => {
            localStream = stream;
            sendMsg('join-room', roomId, userId);
            const video = document.createElement('video');
            addVideo(video, localStream, true, userId);
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
    Object.keys(peerList).forEach((uId) => {
        const video = peerList[uId].video;
        video.remove();
        const peerCon = peerList[uId].peerCon;
        peerCon.close();
    });
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
