//@ts-check
const WS = require('ws');
const EXPRESS = require('express');
const PATH = require('path');
const PORT = 3000;
let users = {};

const app = EXPRESS();

app.use(EXPRESS.static(PATH.join(__dirname, 'webpage')));

const server = app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}!`);
});

const wss = new WS.Server({
    server: server,
    path: '/socket'
});

wss.on('connection', (ws, req) => {

    ws.on('error', (error) => {
        console.log('Connection error ' + error);
    });

    ws.on('open', () => {
        console.log('Connection opened!');
    });

    ws.on('close', () => {
        console.log('Connection closed!');
    });

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log("Invalid JSON");
            data = {};
        }
        switch (data.type) {
            case 'login': {
                handleLogin(ws, data);
                break;
            }
            case 'call': {
                handleCall(ws, data);
                break;
            }
            case 'answer': {
                handleAnswer(ws, data);
                break;
            }
            case 'stop': {
                handleStop(ws, data);
                break;
            }
            case 'candidate': {
                handleCandidate(ws, data);
                break;
            }
        }
    });
});

function send(ws, message) {
    ws.send(JSON.stringify(message));
}

function handleLogin(ws, data) {
    console.log('Login : ', data);
    users[data.name] = ws;
    ws['name'] = data.name;
    send(
        ws,
        {
            type: 'login',
            success: true
        }
    );
}

function handleCall(ws, data) {
    console.log(`${ws.name} calling ${data.name}`);
    var conn = users[data.name];
    if (conn) {
        ws['otherName'] = data.name;
        send(
            conn,
            {
                type: 'call',
                offer: data.offer,
                name: ws['name']
            }
        );
    }
}

function handleAnswer(ws, data) {
    console.log(`${ws.name} Connected to ${data.name}`);
    var conn = users[data.name];
    if (conn) {
        ws['otherName'] = data.name;
        send(
            conn,
            {
                type: "answer",
                answer: data.answer
            }
        );
    }
}

function handleStop(ws, data) {
    console.log(`${ws.name} Dis-connected ${data.name}`);
    var conn = users[data.name];
    conn.otherName = null;
    if (conn) {
        send(
            conn,
            {
                type: 'stop'
            }
        );
    }
}

function handleCandidate(ws, data) {
    console.log(`${ws.name} sending candidate to ${data.name}`);
    var conn = users[data.name];
    if (conn) {
        send(
            conn,
            {
                type: 'candidate',
                candidate: data.candidate
            }
        );
    }
}
