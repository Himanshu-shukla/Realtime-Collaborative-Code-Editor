import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        forceNew: true,
        reconnectionAttempts: Infinity,
        timeout: 10000,
        transports: ['websocket'],
    };
    
    return io('https://realtime-collaborative-code-editor-az0d.onrender.com:5001', options);
};
