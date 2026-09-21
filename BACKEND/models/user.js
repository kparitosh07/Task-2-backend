import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        profile: {
            type: String,
            default: ""
        },

        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            minlength: 3,
            maxlength: 20
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            validate: {
                validator: function(v) {
                    return v.endsWith('@akgec.ac.in');
                },
                message: props => `${props.value} is not a permitted email domain!`
            }
        },

        password: {
            type: String,
            required: true
        },

        googleId: {
            type: String,
            unique: true,
            sparse: true
        },
    },
    {
        timestamps: true
    }
);

export const User = mongoose.model("User", userSchema);