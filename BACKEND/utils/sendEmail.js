import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

export const sendVerificationEmail = async (email, otp) => {
    try {
        console.log("EMAIL_USER:", process.env.EMAIL_USER);
        console.log(
            "EMAIL_PASSWORD exists:",
            !!process.env.EMAIL_PASSWORD
        );

        await transporter.sendMail({
            from: `"ChatApp" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify your ChatApp account",
            html: `
                <h2>Verify your ChatApp account</h2>
                <p>Your verification code is:</p>
                <h1>${otp}</h1>
                <p>This OTP will expire in 10 minutes.</p>
            `
        });

        console.log("EMAIL SENT SUCCESSFULLY");

    } catch (error) {
        console.error("NODEMAILER ERROR:", error);
        throw error;
    }
};