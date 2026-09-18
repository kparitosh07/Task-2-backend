import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            minlength: 3,
            maxlength: 20
        },

        password: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

export const User = mongoose.model("User", userSchema);