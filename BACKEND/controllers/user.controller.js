import { User } from "../models/user.js";
import cloudinary from "../config/cloudinary.js";

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!req.file) {
            return res.status(400).json({
                message: "Profile picture is required"
            });
        }

        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: "chatapp/profiles"
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );

            stream.end(req.file.buffer);
        });

        const user = await User.findByIdAndUpdate(
            userId,
            {
                profile: uploadResult.secure_url
            },
            {
                new: true
            }
        );

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            message: "Profile picture updated successfully",
            profile: user.profile
        });

    } catch (error) {
        console.log("Profile update error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};