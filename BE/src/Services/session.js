// Login sessions: short access token + long refresh token in an httpOnly cookie
//
//  access token  : JWT, 15 minutes, sent by the frontend in the "x" header, kept ONLY in memory (never in storage)
//  refresh token : random secret, in an httpOnly cookie (JavaScript can't read it, so XSS can't steal it)
//                  -> POST /refresh gives a new access token and ROTATES the refresh token (old one stops working)
//                  -> hard limit: 30 days with "remember me", 1 day without; refreshing never extends it
//                  -> logout / password change delete the session in the database = instantly revoked
import crypto from "crypto"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import { sessionModel } from "../DB/Models/session.model.js"
import { userModel } from "../DB/Models/user.model.js"

export const ACCESS_TOKEN_TTL = "15m"
export const COOKIE_NAME = "rt"
const DAY = 24 * 60 * 60 * 1000
const GRACE_MS = 30 * 1000      // a replaced refresh token still works for 30s (two tabs refreshing together)
const MAX_SESSIONS = 10         // devices per user; the oldest is logged out

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex")
const newSecret = () => crypto.randomBytes(32).toString("base64url")

// httpOnly: JS can't read it | secure: HTTPS only (live site) | sameSite strict: never sent from other sites (CSRF)
// without "remember me" there is no expires -> the browser deletes it when it closes
const cookieOptions = (session) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    ...(session?.remember ? { expires: session.expiresAt } : {})
})

const setCookie = (res, session, secret) => res.cookie(COOKIE_NAME, `${session._id}.${secret}`, cookieOptions(session))
export const clearCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions())

// Express 5 doesn't read cookies by itself -> tiny parser for our one cookie
const readCookie = (req) => {
    const header = req.headers.cookie ?? ""
    for (const part of header.split(";")) {
        const [name, ...rest] = part.trim().split("=")
        if (name === COOKIE_NAME) return decodeURIComponent(rest.join("="))
    }
    return null
}

// "<sessionId>.<secret>" -> { sid, secret } or null
const parseRefresh = (req) => {
    const raw = readCookie(req)
    if (!raw) return null
    const [sid, secret] = raw.split(".")
    if (!mongoose.isValidObjectId(sid) || !secret) return null
    return { sid, secret }
}

/** the 15-minute access token; sid ties it to its session so logout revokes it at once */
export const signAccessToken = (user, sid) =>
    jwt.sign(
        { id: user._id, role: user.role, sid: String(sid) },
        user.role === "admin" ? process.env.ADMIN_KEY : process.env.USER_KEY,
        { expiresIn: ACCESS_TOKEN_TTL }
    )

/** after a correct password: new session + cookie, returns the access token */
export const startSession = async (req, res, user, remember) => {
    const secret = newSecret()
    const session = await sessionModel.create({
        userId: user._id,
        tokenHash: hash(secret),
        remember: Boolean(remember),
        userAgent: String(req.headers["user-agent"] ?? "").slice(0, 200),
        expiresAt: new Date(Date.now() + (remember ? 30 : 1) * DAY)
    })

    // keep at most MAX_SESSIONS devices
    const old = await sessionModel.find({ userId: user._id }).sort({ createdAt: -1 }).skip(MAX_SESSIONS).select("_id")
    if (old.length) await sessionModel.deleteMany({ _id: { $in: old.map((s) => s._id) } })

    setCookie(res, session, secret)
    return signAccessToken(user, session._id)
}

/**
 * POST /refresh: cookie -> new access token (+ rotated cookie)
 * returns { token, user } or { error }
 */
export const refreshSession = async (req, res) => {
    const parsed = parseRefresh(req)
    if (!parsed) return { error: "please log in" }

    const now = new Date()
    const presented = hash(parsed.secret)
    const next = newSecret()

    // rotate atomically: only succeeds if the cookie holds the CURRENT token and the session hasn't expired
    let session = await sessionModel.findOneAndUpdate(
        { _id: parsed.sid, tokenHash: presented, expiresAt: { $gt: now } },
        { tokenHash: hash(next), prevHash: presented, prevValidUntil: new Date(now.getTime() + GRACE_MS) },
        { returnDocument: "after" }
    )

    if (session) {
        setCookie(res, session, next)
    } else {
        session = await sessionModel.findById(parsed.sid)
        const inGrace = session && session.expiresAt > now &&
            session.prevHash === presented && session.prevValidUntil > now
        if (!inGrace) {
            // an OLD refresh token came back after the grace time (copied / stolen?) -> end that session for safety.
            // (the real browser always has the newest cookie, so only a copy can still hold an old one)
            if (session && session.tokenHash !== presented) await session.deleteOne()
            clearCookie(res)
            return { error: "your session has ended, please log in again" }
        }
        // another tab already rotated a moment ago: give an access token, keep the browser's newer cookie
    }

    const user = await userModel.findById(session.userId)
    if (!user) {
        await session.deleteOne()
        clearCookie(res)
        return { error: "please log in" }
    }
    return {
        token: signAccessToken(user, session._id),
        user: { name: user.name, email: user.email, role: user.role }
    }
}

/** POST /logout: delete this device's session (if the cookie is valid) and the cookie */
export const endSession = async (req, res) => {
    const parsed = parseRefresh(req)
    if (parsed) {
        const h = hash(parsed.secret)
        await sessionModel.deleteOne({ _id: parsed.sid, $or: [{ tokenHash: h }, { prevHash: h }] })
    }
    clearCookie(res)
}

/** log out every device (password reset, account deleted); keepSid = stay logged in here */
export const endAllSessions = (userId, keepSid) =>
    sessionModel.deleteMany({ userId, ...(keepSid && { _id: { $ne: keepSid } }) })
