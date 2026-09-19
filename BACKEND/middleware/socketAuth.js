import jwt from "jsonwebtoken";
import { User } from "../models/user.js";

const socketAuth = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Authentication required"));
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.userId).select("_id username profile").lean();

        if (!user) {
            return next(new Error("User no longer exists"));
        }

        socket.userId = user._id.toString();
        socket.username = user.username;
        socket.profile = user.profile || "";
        next();

    } catch (error) {
        console.log(
            "Socket authentication error:",
            error.message
        );
        next(new Error("Invalid authentication token"));
    }
};

export default socketAuth;