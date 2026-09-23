import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

export const sendVerificationEmail = async (email, otp) => {

    await transporter.sendMail({
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
};