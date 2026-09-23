import express from "express";
import { signup, login, googleLogin , verifyEmail, resendOTP} from "../controllers/auth.controller.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/signup", signup);

router.post("/verify-email", verifyEmail);

router.post("/resend-otp", resendOTP);

router.post("/login", login);

router.post("/google-login", googleLogin);

export default router;