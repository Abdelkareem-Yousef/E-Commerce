import Stripe from "stripe"

let client = null

/** the Stripe client, created on first use (reads STRIPE_SECRET_KEY from .env) */
export const stripe = () => {
    if (!process.env.STRIPE_SECRET_KEY) {
        const e = new Error("card payments are not set up yet (STRIPE_SECRET_KEY is missing in .env)")
        e.status = 503
        throw e
    }
    client ??= new Stripe(process.env.STRIPE_SECRET_KEY)
    return client
}

export const currency = () => (process.env.STRIPE_CURRENCY || "usd").toLowerCase()
export const frontendUrl = () => process.env.FRONTEND_URL ?? "http://localhost:4200"

/** 12.5 -> 1250 (Stripe wants the smallest unit, e.g. cents) */
export const toCents = (amount) => Math.round(Number(amount) * 100)
