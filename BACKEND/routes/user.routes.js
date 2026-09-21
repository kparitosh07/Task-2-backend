import express from "express";
import { updateProfile } from "../controllers/user.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.put("/profile",authMiddleware,upload.single("profilePicture"),updateProfile);

export default router;