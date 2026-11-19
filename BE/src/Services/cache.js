// Redis cache-aside for the store's catalog (product lists, product details, category menu)
//
//  read:  look in Redis -> HIT: return the copy | MISS: read MongoDB, save a copy with a TTL
//  write: after a change in MongoDB, invalidate:
//         - lists / menu / category pages -> bump "catalog:version" (every old list key is skipped at once)
//         - product details              -> DEL product:<id>
//
// MongoDB is always the real data. If REDIS_URL is missing or Redis is down,
// every function quietly falls back to MongoDB, so the store keeps working.
import Redis from "ioredis"

export const TTL = 600                     // 10 minutes (fixed: reads do NOT restart it)
const VERSION_KEY = "catalog:version"      // no TTL: lives as long as Redis does

let client = null
let lastErrorLog = 0

// created on first use, because .env is loaded inside bootstrap()
const redis = () => {
    if (client || !process.env.REDIS_URL) return client
    client = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,     // a command fails fast instead of waiting
        enableOfflineQueue: false,   // while disconnected: fail now -> use MongoDB
        connectTimeout: 5000
    })
    client.on("ready", () => console.log("Redis connected"))
    // without this listener a Redis error would crash the server; log at most once a minute
    client.on("error", (err) => {
        if (Date.now() - lastErrorLog > 60_000) {
            lastErrorLog = Date.now()
            console.error("Redis error (using MongoDB only):", err.message)
        }
    })
    return client
}

// HIT / MISS lines: always on your PC, on Render only when CACHE_LOG=true
const log = (msg) => {
    if (process.env.NODE_ENV !== "production" || process.env.CACHE_LOG === "true") console.log(msg)
}

/**
 * cache-aside in one function.
 * load() runs only on a miss; whatever it returns is saved (null / undefined is never saved).
 */
export const cached = async (key, load, ttl = TTL) => {
    const r = redis()
    if (r) {
        try {
            const hit = await r.get(key)
            if (hit !== null) {
                log(`cache HIT  ${key}`)
                return JSON.parse(hit)
            }
        } catch { /* Redis down -> MongoDB */ }
    }

    log(`cache MISS ${key}`)
    const data = await load()

    if (r && data !== null && data !== undefined) {
        try {
            await r.set(key, JSON.stringify(data), "EX", ttl)
        } catch { /* not saved: the next request just misses again */ }
    }
    return data
}

/** current catalog version (missing -> 0) */
const version = async () => {
    const r = redis()
    if (!r) return "0"
    try {
        return (await r.get(VERSION_KEY)) ?? "0"
    } catch {
        return "0"
    }
}

/** key for lists / pages / menu, e.g. catalog:v8:products:p2:l20 */
export const listKey = async (...parts) => `catalog:v${await version()}:${parts.join(":")}`

/** key for one product's details page */
export const productKey = (id) => `product:${id}`

/**
 * call after ANY change that the store's pages show:
 * product add / edit / delete / hide, stock change (orders), brand / category / subcategory change.
 * ids = products whose details page changed (optional)
 */
export const catalogChanged = async (ids = []) => {
    const r = redis()
    if (!r) return
    try {
        await r.incr(VERSION_KEY)                                // all lists, pages and the menu
        const keys = [...new Set(ids.map((id) => String(id?._id ?? id)))].map(productKey)   // ids or populated docs
        if (keys.length) await r.del(...keys)                    // those details pages
        log(`cache INVALIDATE catalog${keys.length ? ` + ${keys.join(", ")}` : ""}`)
    } catch { /* Redis down: copies still expire by TTL */ }
}
