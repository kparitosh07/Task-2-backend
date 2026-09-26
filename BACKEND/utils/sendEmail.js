import { BrevoClient } from "@getbrevo/brevo";

const brevo = new BrevoClient({
    apiKey: process.env.BREVO_API_KEY
});

export const sendVerificationEmail = async (email, otp) => {
    try {
        console.log("Trying to send email to:", email);

        const result = await brevo.transactionalEmails.sendTransacEmail({
            sender: {
                name: "ChatApp",
                email: process.env.BREVO_EMAIL
            },

            to: [
                {
                    email: email
                }
            ],

            subject: "Verify your ChatApp account",

            htmlContent: `
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

        console.log("EMAIL SENT:", result);

    } catch (error) {
        console.error("BREVO EMAIL ERROR:", error);
        throw error;
    }
};