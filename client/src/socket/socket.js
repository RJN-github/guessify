import {io}from 'socket.io-client'

const SERVER_URL = import.meta.env.MODE === 'production' 
    ? window.location.origin 
    : 'http://localhost:3000';

const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true,
    timeout: 20000 ,
    forceNew: true ,
    reconnection: true ,
    reconnectionDelay: 1000 ,
    reconnectionAttempts : 5,
});

socket.on('connect', () => {
    console.log(`Connected to the Server!`);
})
socket.on('disconnect', () => {
    console.log(`Disconnected from the Server!`);
})
socket.on('connect_error', (error) => {
    console.log(`Connection Error: ${error}`);
})
socket.on('disconnect_error', (error) => {
    console.log(`Connection Error: ${error}`);
})
socket.on('reconnect_error', (error) => {
    console.log(`Connection Error: ${error}`);
})

export default socket;