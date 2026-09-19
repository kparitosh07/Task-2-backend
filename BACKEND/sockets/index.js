import socketAuth from "../middleware/socketAuth.js";
import { searchUsers } from "./user.socket.js";
import { registerChatHandlers } from "./chat.socket.js";

const onlineUsers = new Map();

export const registerSocketHandlers = (io) => {

    io.use(socketAuth);

    io.on("connection", (socket) => {

        console.log(
            `${socket.username} connected`
        );

        socket.join(`user:${socket.userId}`);

        onlineUsers.set(
            socket.userId,
            socket.id
        );

        io.emit("user-status", {
            userId: socket.userId,
            online: true
        });

        socket.on("search-users", (search) => {
            searchUsers(
                socket,
                onlineUsers,
                search
            );
        });

        registerChatHandlers(
            socket,
            io,
            onlineUsers
        );

        socket.on("disconnect", () => {

            console.log(
                `${socket.username} disconnected`
            );

            onlineUsers.delete(
                socket.userId
            );

            io.emit("user-status", {
                userId: socket.userId,
                online: false
            });
        });
    });
};