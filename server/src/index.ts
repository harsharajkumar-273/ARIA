import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PORT } from './config';
import healthRouter from './routes/health';
import webhookRouter from './routes/webhook';
import statsRouter from './routes/stats';
import submitRouter from './routes/submit';
import demoRouter from './routes/demo';
import citizenRouter from './routes/routes';
import crewsRouter from './routes/crews';
import verifyRouter from './routes/verify';

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io connection logging
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Routes
app.use('/api', healthRouter);
app.use('/api', statsRouter);
app.use('/api', submitRouter);
app.use('/api', demoRouter);
app.use('/api', citizenRouter);
app.use('/api', crewsRouter);
app.use('/api', verifyRouter);
app.use(webhookRouter);

import { startBackgroundJobs } from './jobs';

// Start server
server.listen(PORT, () => {
  console.log(`🚀 ARIA Backend Server running on port ${PORT}`);
  startBackgroundJobs();
});
