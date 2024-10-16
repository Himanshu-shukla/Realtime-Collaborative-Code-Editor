const express = require('express');
const app = express();

const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');


const ACTIONS = require('./src/actions/Actions');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'https://realtime-collaborative-code-editor-az0d.onrender.com', // Replace with your client's URL
        methods: ['GET', 'POST'],
        credentials: true,
    },
});


app.use(express.static('build'));
app.use(express.json());

app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const userSocketMap = {};
function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

// Serve response in production
app.get('/', (req, res) => {
    const htmlContent = '<h1>Welcome to the code editor server</h1>';
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
});

app.post('/compile', async (req, res) => {
    const { code, lang, input } = req.body;

    try {
        const options = {
            method: 'POST',
            url: 'https://online-code-compiler.p.rapidapi.com/v1/',
            headers: {
              'x-rapidapi-key': '936e9ee82fmshb68bf453e860de7p1bef93jsnc55ed21ca742',
              'x-rapidapi-host': 'online-code-compiler.p.rapidapi.com',
              'Content-Type': 'application/json'
            },
            data: {
              language: lang ==="clike"? "cpp" : lang,
              version: 'latest',
              code: code,
              input: input
            }
        };
        
        const response = await axios.request(options);
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'An error occurred' });
    }
});


const PORT = process.env.SERVER_PORT || 5001;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));