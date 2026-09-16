import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Message } from "./models/message.js";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

mongoose.connect(process.env.MongoDb_URI)
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch((error) => {
        console.log("MongoDB connection error:", error);
    });

app.use(express.static(join(__dirname, "../FRONTEND")));

app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "../FRONTEND/index.html"));
});

const users = new Map();

io.on("connection", (socket) => {

    console.log("Connected:", socket.id);

    socket.on("join", (username) => {
        users.set(socket.id, username);
        console.log(`${username} joined`);
        io.emit("users", getUsers());
    });


    socket.on("private-message", async (data) => {
        try {
            const senderName = users.get(socket.id);
            if (!senderName) return;
            const receiverSocket = io.sockets.sockets.get(
                data.receiverId
            );

            if (!receiverSocket) {
                console.log("Receiver is offline");
                return;
            }

            const newMessage = await Message.create({
                senderId: socket.id,
                receiverId: data.receiverId,
                senderName: senderName,
                message: data.message
            });

            const messageData = {
                _id: newMessage._id,
                senderId: socket.id,
                receiverId: data.receiverId,
                senderName: senderName,
                message: data.message,
                createdAt: newMessage.createdAt
            };

            socket.emit("private-message", messageData);

            receiverSocket.emit("private-message",messageData);

        } catch (error) {
            console.log("Message error:", error);
        }

    });

    socket.on("load-messages", async (receiverId) => {
        try {
            const messages = await Message.find({
                $or: [
                    {
                        senderId: socket.id,
                        receiverId: receiverId
                    },

                    {
                        senderId: receiverId,
                        receiverId: socket.id
                    }
                ]

            }).sort({ createdAt: 1 });

            socket.emit( "chat-history", messages);
        } catch (error) {
            console.log("Chat history error:", error);
        }
    });

    socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id);
        users.delete(socket.id);
        io.emit("users", getUsers());
    });
});

function getUsers() {
    return [...users.entries()].map(
        ([id, username]) => ({id,username})
    );
}

server.listen(3000, () => {
    console.log(
        "Server is running at http://localhost:3000"
    );
});