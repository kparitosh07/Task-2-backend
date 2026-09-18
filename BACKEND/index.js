import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Message } from "./models/message.js";
import { User } from "./models/user.js";
import { signup, login } from "./controllers/auth.controller.js";
import jwt from "jsonwebtoken";


dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(express.static(join(__dirname, "../FRONTEND")));

mongoose.connect(process.env.MongoDb_URI)
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch((error) => {
        console.log("MongoDB connection error:", error);
    });

app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "../FRONTEND/index.html"));
});

app.post("/api/signup", signup);

app.post("/api/login", login);

const onlineUsers = new Map();

io.use(async(socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Authentication required"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId).select("_id username").lean();

        if (!user) {
            return next(new Error("User no longer exists"));
        }

        socket.userId = decoded.userId;
        socket.username = decoded.username;
        next();

    } catch (error) {
        console.log("Socket authentication error:", error.message);
        next(new Error("Invalid authentication token"));
    }
});

io.on("connection", async (socket) => {
    console.log(`${socket.username} connected`);
    console.log("Socket ID:", socket.id);
    console.log("User ID:", socket.userId);

    socket.join(`user:${socket.userId}`);
        onlineUsers.set(socket.userId, socket.id);
        io.emit("user-status", {
        userId: socket.userId,
        online: true
    });

    socket.on("search-users", async (search) => {
        try {
            if (!search?.trim()) {
                return socket.emit("search-results", []);
            }

            const users = await User.find({
                username: {
                    $regex: search.trim(),
                    $options: "i"
                },
                _id: {
                    $ne: socket.userId
                }
            })
                .select("_id username")
                .limit(20)
                .lean();

            const results = users.map((user) => ({
                id: user._id.toString(),
                username: user.username,
                online: onlineUsers.has(user._id.toString())
            }));

            socket.emit("search-results", results);

        } catch (error) {
            console.log("Search users error:", error);
        }
    });

    socket.on("load-messages", async (receiverId) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(receiverId)) {
                return;
            }

            const messages = await Message.find({
                $or: [
                    {
                        senderId: socket.userId,
                        receiverId: receiverId
                    },

                    {
                        senderId: receiverId,
                        receiverId: socket.userId
                    }

                ]

            }).sort({
                createdAt: 1
            }).lean();

            const messageData = messages.map((message) => ({
                id: message._id.toString(),
                senderId: message.senderId.toString(),
                receiverId: message.receiverId.toString(),
                senderName: message.senderName || "",
                message: message.message,
                createdAt: message.createdAt
            })
            );

            socket.emit("chat-history", messageData);

        }
        catch (error) {
            console.log("Chat history error:", error);
        }
    });

    socket.on("load-chat-list", async () => {
        try {
            const messages = await Message.find({
                $or: [
                    { senderId: socket.userId },
                    { receiverId: socket.userId }
                ]
            })
                .sort({ createdAt: -1 })
                .lean();

            const chatUsers = new Map();

            for (const message of messages) {

                const otherUserId =
                    message.senderId.toString() === socket.userId
                        ? message.receiverId.toString()
                        : message.senderId.toString();

                if (!chatUsers.has(otherUserId)) {

                    const user = await User.findById(otherUserId)
                        .select("_id username")
                        .lean();

                    if (user) {
                        chatUsers.set(otherUserId, {
                            id: user._id.toString(),
                            username: user.username,
                            online: onlineUsers.has(
                                user._id.toString()
                            )
                        });
                    }
                }
            }

            socket.emit(
                "chat-list",
                [...chatUsers.values()]
            );

        } catch (error) {
            console.log("Chat list error:", error);
        }
    });

    socket.on("private-message", async (data) => {
        try {
            const { receiverId, message } = data;

            if (!receiverId || !message?.trim()) {
                return;
            }

            if (!mongoose.Types.ObjectId.isValid(receiverId)) {
                return;
            }

            const receiver = await User.findById(receiverId);

            if (!receiver) {
                return;
            }

            const newMessage = await Message.create({
                senderId: socket.userId,
                receiverId: receiverId,
                senderName: socket.username,
                message: message.trim()
            });

            const messageData = {
                id: newMessage._id.toString(),
                senderId: socket.userId,
                receiverId: receiverId,
                senderName: socket.username,
                message: newMessage.message,
                createdAt: newMessage.createdAt
            };

            socket.emit("private-message", messageData);

            io.to(`user:${receiverId}`).emit("private-message", messageData);
            socket.emit("chat-added", {
                id: receiverId,
                username: receiver.username,
                online: true
            });

            io.to(`user:${receiverId}`).emit("chat-added", {
                id: socket.userId,
                username: socket.username,
                online: true
            });

        } catch (error) {
            console.log("Message error:", error);
        }
    });

    socket.on("disconnect", () => {
        console.log(`${socket.username} disconnected`);
        console.log("Socket ID:", socket.id);

        onlineUsers.delete(socket.userId);

        io.emit("user-status", {
            userId: socket.userId,
            online: false
        });
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});