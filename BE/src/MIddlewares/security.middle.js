import { rateLimit } from "express-rate-limit"

// ---------------- NoSQL injection ----------------
// MongoDB operators start with "$" (e.g. {"$ne": null}, {"$gt": ""}) and "." reaches into nested fields.
// A normal request never needs those as KEYS, so any request that sends one is refused.
// "__proto__" / "constructor" / "prototype" are refused too (prototype pollution).
const BAD_KEYS = new Set(["__proto__", "constructor", "prototype"])

const findBadKey = (value, path = "") => {
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            const bad = findBadKey(value[i], `${path}[${i}]`)
            if (bad) return bad
        }
        return null
    }
    if (value && typeof value === "object" && !Buffer.isBuffer(value) && !(value instanceof Date)) {
        for (const key of Object.keys(value)) {
            if (key.startsWith("$") || key.includes(".") || BAD_KEYS.has(key)) return path ? `${path}.${key}` : key
            const bad = findBadKey(value[key], path ? `${path}.${key}` : key)
            if (bad) return bad
        }
    }
    return null
}

/** checks body, query and params; runs on every request (and again after multer for form-data) */
export const noSqlInjection = (req, res, next) => {
    const bad = findBadKey(req.body) ?? findBadKey(req.query) ?? findBadKey(req.params)
    if (bad) {
        return res.status(400).json({ message: `invalid field name in request: "${bad}"` })
    }
    return next()
}

// ---------------- request limits ----------------
// counted per IP address. Too many requests -> 429 with a message the frontend already shows.
const limiter = (minutes, limit, message) =>
    rateLimit({
        windowMs: minutes * 60 * 1000,
        limit,
        standardHeaders: "draft-8",   // sends RateLimit headers so clients can see how many are left
        legacyHeaders: false,
        message: { message }
    })

/** whole API: 300 requests / 15 minutes per IP */
export const apiLimiter = limiter(15, 300, "too many requests, please try again in a few minutes")

/** login, register, password reset: 10 tries / 15 minutes per IP (stops password guessing and email spam) */
export const authLimiter = limiter(15, 10, "too many attempts, please wait 15 minutes and try again")

/** coupon codes: 20 tries / 15 minutes per IP (stops guessing codes) */
export const couponLimiter = limiter(15, 20, "too many coupon attempts, please wait a few minutes")
