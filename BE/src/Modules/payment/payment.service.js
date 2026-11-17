import { orderModel } from "../../DB/Models/order.model.js"
import { stripe, currency, frontendUrl, toCents } from "../../Services/stripe.js"

const shortId = (order) => order._id.toString().slice(-6).toUpperCase()

/**
 * Create a Stripe Checkout page for an order and remember its id on the order.
 * The whole order (after the coupon) is one line, so the coupon discount is always right.
 */
export const createCheckoutSession = async (order, user) => {
    await order.populate("products.productId", "name image")
    const names = order.products.map((i) => `${i.productId?.name ?? "Product"} × ${i.quantity}`)
    const firstImage = order.products.find((i) => i.productId?.image?.secure_url)?.productId.image.secure_url
    const count = order.products.reduce((n, i) => n + i.quantity, 0)

    const session = await stripe().checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        client_reference_id: order._id.toString(),
        metadata: { orderId: order._id.toString() },
        payment_intent_data: { metadata: { orderId: order._id.toString() } },
        line_items: [{
            quantity: 1,
            price_data: {
                currency: currency(),
                unit_amount: toCents(order.total),
                product_data: {
                    name: `Order #${shortId(order)} (${count} item${count === 1 ? "" : "s"})`,
                    description: names.join(", ").slice(0, 500) + (order.discount ? ` · coupon ${order.coupon?.code}` : ""),
                    ...(firstImage ? { images: [firstImage] } : {})
                }
            }
        }],
        // the page stops working after 1 hour (Stripe's minimum is 30 minutes)
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
        success_url: `${frontendUrl()}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl()}/payment/cancel?order=${order._id}`
    })

    order.stripeSessionId = session.id
    await order.save()
    return session
}

/**
 * Called after Stripe says a checkout page was paid (from the success page or the webhook).
 * Safe to call more than once.
 */
export const markSessionPaid = async (session) => {
    const orderId = session.metadata?.orderId ?? session.client_reference_id
    const order = await orderModel.findById(orderId)
    if (!order || session.payment_status !== "paid") return order

    if (order.paymentStatus !== "paid" && order.paymentStatus !== "refunded") {
        order.paymentStatus = "paid"
        order.paidAt = new Date()
        order.paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id
        order.stripeSessionId = session.id
        await order.save()

        // the order was canceled while the customer was paying -> give the money back
        if (order.status === "canceled" && order.paymentIntentId) {
            const refund = await stripe().refunds.create({ payment_intent: order.paymentIntentId })
            order.paymentStatus = "refunded"
            order.refundId = refund.id
            await order.save()
        }
    }
    return order
}
