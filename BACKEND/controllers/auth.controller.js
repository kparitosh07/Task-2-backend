import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/user.js";

export const signup = async (req, res) => {
    try {
        let { username, password } = req.body;
        
        username = username?.trim().toLowerCase();

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({
                message: "Username must be 3-20 characters"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        }

        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(409).json({
                message: "Username already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            password: hashedPassword
        });

        res.status(201).json({
            message: "Account created successfully",
            username: user.username
        });

    } catch (error) {
        console.log("Signup error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Username already exists"
            });
        }

        res.status(500).json({
            message: "Server error"
        });
    }
};


export const login = async (req, res) => {
    try {
        let { username, password } = req.body;

        username = username?.trim().toLowerCase();

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        
        const token = jwt.sign(
            {
                userId: user._id.toString(),
                username: user.username
            }, 
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id.toString(),
                username: user.username
            }
        });

    } catch (error) {
        console.log("Login error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};