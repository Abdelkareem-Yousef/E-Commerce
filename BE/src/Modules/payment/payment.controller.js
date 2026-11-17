import { orderModel } from "../../DB/Models/order.model.js"
import { stripe } from "../../Services/stripe.js"
import { cancelOrder } from "../Order/order.service.js"
import { createCheckoutSession, markSessionPaid } from "./payment.service.js"

const sendError = (res, next, error) =>
    error.status ? res.status(error.status).json({ message: error.message }) : next(error)

// POST /payment/checkout/:orderId  -> a new Stripe page for an unpaid card order ("Pay now" / "Try again")
const pay_order = async (req, res, next) => {
    try {
        const order = await orderModel.findOne({ _id: req.params.orderId, userId: req.user._id })
        if (!order) return res.status(404).json({ message: "order not found" })
        if (order.paymentMethod !== "card") return res.status(400).json({ message: "this order is paid with cash on delivery" })
        if (order.paymentStatus === "paid") return res.status(400).json({ message: "this order is already paid" })
        if (order.status !== "pending") return res.status(400).json({ message: "this order can't be paid anymore" })

        // close an older payment page so the order can't be paid twice
        if (order.stripeSessionId) {
            const old = await stripe().checkout.sessions.retrieve(order.stripeSessionId).catch(() => null)
            if (old?.payment_status === "paid") {
                // paid earlier but we didn't hear about it (tab closed, no webhook): fix the order now
                await markSessionPaid(old)
                return res.status(409).json({ message: "this order is already paid", alreadyPaid: true })
            }
            if (old?.status === "open") await stripe().checkout.sessions.expire(old.id).catch(() => {})
        }

        const session = await createCheckoutSession(order, req.user)
        res.json({ message: "payment page created", checkoutUrl: session.url })
    } catch (error) {
        return sendError(res, next, error)
    }
}

// GET /payment/verify?session_id=...  -> the success page asks Stripe directly whether it was paid
// (works on your computer without setting up a webhook)
const verify_payment = async (req, res, next) => {
    try {
        const { session_id } = req.query
        if (!session_id) return res.status(400).json({ message: "session_id is required" })

        const session = await stripe().checkout.sessions.retrieve(String(session_id))
        const orderId = session.metadata?.orderId ?? session.client_reference_id
        const order = await orderModel.findOne({ _id: orderId, userId: req.user._id })
        if (!order) return res.status(404).json({ message: "order not found" })

        const updated = (await markSessionPaid(session)) ?? order
        res.json({
            message: session.payment_status === "paid" ? "payment received" : "payment not completed",
            paid: session.payment_status === "paid",
            order: updated
        })
    } catch (error) {
        return sendError(res, next, error)
    }
}

// POST /payment/webhook  -> Stripe tells the server about payments (needs the raw body, see bootstrap.js)
const stripe_webhook = async (req, res) => {
    let event
    try {
        const secret = process.env.STRIPE_WEBHOOK_SECRET
        if (!secret) return res.status(400).send("STRIPE_WEBHOOK_SECRET is missing in .env")
        event = stripe().webhooks.constructEvent(req.body, req.headers["stripe-signature"], secret)
    } catch (err) {
        return res.status(400).send(`Webhook error: ${err.message}`)
    }

    try {
        const session = event.data.object
        switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
                await markSessionPaid(session)
                break
            case "checkout.session.expired": {
                // the customer never paid -> cancel the order and put the items back
                // (only if this is still the order's current payment page)
                const order = await orderModel.findById(session.metadata?.orderId)
                if (order && order.status === "pending" && order.paymentStatus === "unpaid" && order.stripeSessionId === session.id) {
                    await cancelOrder(order)
                }
                break
            }
        }
        res.json({ received: true })
    } catch (err) {
        console.error("stripe webhook:", err)
        res.status(500).send("webhook handler failed")
    }
}

export { pay_order, verify_payment, stripe_webhook }
