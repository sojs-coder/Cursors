import { server } from './server';
import { io } from './socket';

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
});


server.listen(3000, () => {
    console.log('Server listening on port 3000');
});