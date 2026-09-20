import express from "express";
import { signup, login, googleLogin} from "../controllers/auth.controller.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/signup",upload.single("profilePicture"),signup);

router.post("/login", login);

router.post("/google-login", googleLogin);

export default router;