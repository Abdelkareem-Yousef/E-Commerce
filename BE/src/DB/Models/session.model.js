import mongoose, { Schema } from "mongoose";

// one document = one logged-in device (laptop, phone, ...)
// the refresh token itself is NEVER stored: only its SHA-256 hash, so a database leak can't log anyone in
const sessionSchema = new Schema({
    userId: {
        type: Schema.ObjectId,
        ref: "user",
        required: true,
        index: true
    },
    tokenHash: {            // hash of the current refresh token (in the httpOnly cookie)
        type: String,
        required: true
    },
    prevHash: String,       // the token just replaced: still accepted for a few seconds (two tabs refreshing at once)
    prevValidUntil: Date,
    remember: {
        type: Boolean,
        default: false
    },
    userAgent: String,      // which browser, shown nowhere yet, useful for "your devices" later
    expiresAt: {            // hard end of the session: refreshing never moves it
        type: Date,
        required: true
    }
}, { timestamps: true })

// MongoDB deletes a session by itself once expiresAt has passed
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const sessionModel = mongoose.model("session", sessionSchema)
