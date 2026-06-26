import express from 'express';
import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';
import cors from 'cors';
import authRouter from './routes/auth';
import shopRouter from './routes/shop';
import { registerSocketHandlers } from './socket/handlers';

const app = express();
const httpServer = createServer(app);
const io = new IOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/shop', shopRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

registerSocketHandlers(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
