import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";

import app from "./app.js";
import connectDB from "./config/db.js";
import { registerSocketHandlers } from "./sockets/index.js";

const PORT = process.env.PORT || 3000;

await connectDB();

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

registerSocketHandlers(io);

server.listen(PORT,"0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});