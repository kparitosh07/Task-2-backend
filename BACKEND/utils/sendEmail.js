import nodemailer from "nodemailer";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    family: 4,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

export const sendVerificationEmail = async (email, otp) => {
    try {
        console.log("Trying to send email to:", email);

        const info = await transporter.sendMail({
            from: `"ChatApp" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify your ChatApp account",

            html: `
                <div style="font-family: Arial; padding: 20px;">
                    <h2>Verify your ChatApp account</h2>

                    <p>Your verification code is:</p>

                    <h1 style="letter-spacing: 8px;">
                        ${otp}
                    </h1>

                    <p>This OTP will expire in 10 minutes.</p>

                    <p>If you didn't create this account, ignore this email.</p>
                </div>
            `
        });

        console.log("EMAIL SENT:", info.messageId);

    } catch (error) {
        console.error("NODEMAILER ERROR:");
        console.error("code:", error.code);
        console.error("command:", error.command);
        console.error("response:", error.response);
        console.error("message:", error.message);

        throw error;
    }
};