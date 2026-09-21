import { User } from "../models/user.js";

export const searchUsers = async (socket, onlineUsers, search) => {
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
        }).select("_id username profile").limit(20).lean();

        const results = users.map((user) => ({
            id: user._id.toString(),
            username: user.username,
            profile: user.profile,
            online: onlineUsers.has(
                user._id.toString()
            )
        }));

        socket.emit("search-results", results);

    } catch (error) {
        console.log("Search users error:", error);
    }
};

export const profileUpdated = (socket,io) => {

    socket.on("profile-updated", (profile) => {
        io.emit("profile-updated", {
            userId: socket.userId,
            profile
        });
    });
};