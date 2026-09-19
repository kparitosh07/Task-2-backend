import express from "express";
import { signup, login } from "../controllers/auth.controller.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/signup",upload.single("profilePicture"),signup);

router.post("/login", login);

export default router;