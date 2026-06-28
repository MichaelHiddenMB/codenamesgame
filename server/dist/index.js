"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const shop_1 = __importDefault(require("./routes/shop"));
const daily_1 = __importDefault(require("./routes/daily"));
const handlers_1 = require("./socket/handlers");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
app.use('/api/shop', shop_1.default);
app.use('/api/daily', daily_1.default);
app.get('/api/health', (_req, res) => res.json({ ok: true }));
// Serve the built Vite client when not in dev mode
const clientDist = path_1.default.join(__dirname, '../../client/dist');
app.use(express_1.default.static(clientDist));
app.get('*', (_req, res) => res.sendFile(path_1.default.join(clientDist, 'index.html')));
(0, handlers_1.registerSocketHandlers)(io);
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`);
});
