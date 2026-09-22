import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";

import { User } from "../models/user.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


export const signup = async (req, res) => {
    try {
        let { username, email, password } = req.body;
        
        username = username?.trim().toLowerCase();

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        if (!email.endsWith("@akgec.ac.in")) {
            return res.status(400).json({
                message: "Please use your AKGEC email (@akgec.ac.in)."
            });
        }

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({
                message: "Username must be 3-20 characters"
            });
        }

        if (password.length < 9) {
            return res.status(400).json({
                message: "Password must be at least 9 characters"
            });
        }

        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({
                message: "Password must contain at least one capital letter"
            });
        }

        if (!/[!@#$%^&*(),.?":{}|<>_\-\\[\]\/+=;'`~]/.test(password)) {
            return res.status(400).json({
                message: "Password must contain at least one special character"
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
            email,
            password: hashedPassword,
            profile: "" 
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
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        if (!email.endsWith("@akgec.ac.in")) {
            return res.status(400).json({
                message: "Please use your AKGEC email (@akgec.ac.in)."
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
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
                username: user.username,
                profile: user.profile
            }
        });

    } catch (error) {
        console.log("Login error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

export const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({
                message: "Google credential is required"
            });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const email = payload.email?.toLowerCase();
        const googleId = payload.sub;
        const emailVerified = payload.email_verified;

        if (!email || !emailVerified) {
            return res.status(401).json({
                message: "Google account email is not verified"
            });
        }

        if (!email.endsWith("@akgec.ac.in")) {
            return res.status(403).json({
                message:
                    "Please use your AKGEC Google account."
            });
        }

        let user = await User.findOne({ email });
        if (!user) {
            let username =email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");

            let existingUsername =await User.findOne({ username });

            if (existingUsername) {
                username = username + Math.floor(Math.random() * 10000);
            }

            user = await User.create({
                username,
                email,
                password: await bcrypt.hash(crypto.randomUUID(),10),
                googleId
            });
        } else {
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
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
            message: "Google login successful",
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                profile: user.profile
            }
        });
    } catch (error) {
        console.error("Google login error:",error);

        res.status(401).json({
            message: "Invalid Google login"
        });
    }
};