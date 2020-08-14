//@ts-check
var socketConn = new WebSocket('ws://localhost:3000/socket');
let nameInput;
let loginBtn;

let localVideo;
let remoteVideo;
let callerName;
let callBtn;
let stopBtn;

let webRTCConn;
let localStream;
let remoteStream;

let myName;
let friendName;

function initializePage() {
    nameInput = document.getElementById('nameInput');
    loginBtn = document.getElementById('loginBtn');
    loginBtn.onclick = () => login();

    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');
    callerName = document.getElementById('callerName');
    callBtn = document.getElementById('callBtn');
    callBtn.onclick = () => call();
    stopBtn = document.getElementById('stopBtn');
    stopBtn.onclick = () => stop();
}

socketConn.onopen = function () {
    console.log("Connected to the signaling server");
    initializePage();
};

socketConn.onerror = (err) => {
    console.log("Got error", err);
};

socketConn.onmessage = (msg) => {
    console.log("Got message", msg);
    let data = msg.data;
    try {
        data = JSON.parse(msg.data);
    } catch (error) {

    }
    switch (data.type) {
        case 'login': {
            handleLogin(data);
            break;
        }
        case 'call': {
            handleCall(data);
            break;
        }
        case 'answer': {
            handleAnswer(data);
            break;
        }
        case 'stop': {
            handleStop();
            break;
        }
        case 'candidate': {
            handleCandidate(data);
            break;
        }
        
    }
};

function sendMsg(message) {
    socketConn.send(JSON.stringify(message));
}

function login() {
    if (nameInput.value) {
        myName = nameInput.value;
        sendMsg({
            type: 'login',
            name: nameInput.value
        });
    }
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

function handleLogin(data) {
    console.log('Logged in!');
    getCameraMedia().then((stream) => {
        localStream = stream;
        localVideo.srcObject = localStream;
        const configuration = {
            iceServers: [
                {
                    'urls': 'stun:stun.l.google.com:19302'
                }
            ]
        };
        webRTCConn = new webkitRTCPeerConnection(configuration);
        localStream.getTracks().forEach(track => {
            webRTCConn.addTrack(track, localStream);
        });

        remoteStream = new MediaStream();
        webRTCConn.ontrack = (ev) => {
            remoteStream.addTrack(ev.track);
        };

        webRTCConn.onicecandidate = (ev) => {
            if (ev.candidate) {
                sendMsg({
                    type: 'candidate',
                    candidate: ev.candidate,
                    name: friendName
                });
            }
        };
    }).catch((err) => {

    });
}

async function call() {
    console.log('callerName : ', callerName);
    if (callerName.value) {
        friendName = callerName.value;
        const offer = await webRTCConn.createOffer();
        webRTCConn.setLocalDescription(offer);
        sendMsg({
            type: 'call',
            offer,
            name: friendName
        });
    }
}

async function handleCall(data) {
    friendName = data.name;
    webRTCConn.setRemoteDescription(new RTCSessionDescription(data.offer));
    remoteVideo.srcObject = remoteStream;
    const answer = await webRTCConn.createAnswer();
    webRTCConn.setLocalDescription(answer);
    console.log('friendName : ', friendName);
    sendMsg({
        type: 'answer',
        answer,
        name: friendName
    });
}

function handleAnswer(data) {
    webRTCConn.setRemoteDescription(new RTCSessionDescription(data.answer));
    remoteVideo.srcObject = remoteStream;
}

function handleCandidate(data) {
    webRTCConn.addIceCandidate(new RTCIceCandidate(data.candidate));
}

function stop() {
    sendMsg({
        type: 'stop',
        name: friendName
    });
    handleStop();
}

function handleStop() {
    friendName = undefined;
    remoteVideo.src = undefined;
    webRTCConn.close();
    webRTCConn.onicecandidate = null;
    webRTCConn.onaddstream = null;
}
