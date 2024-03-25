import { createServer } from 'http';
import { Server } from 'socket.io';
import { app } from './app';


const server = createServer(app);


export { server };
