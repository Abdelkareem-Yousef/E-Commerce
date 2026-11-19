import { productModel } from "../../DB/Models/product.model.js"
import { couponModel } from "../../DB/Models/coupon.model.js"
import { stripe } from "../../Services/stripe.js"
import { catalogChanged } from "../../Services/cache.js"

// customers can cancel their own order for this many hours after placing it
export const CANCEL_WINDOW_HOURS = 5

export const cancelDeadline = (order) =>
    new Date(new Date(order.createdAt).getTime() + CANCEL_WINDOW_HOURS * 60 * 60 * 1000)

/** true when the customer is still allowed to cancel */
export const canCustomerCancel = (order) =>
    order.status === "pending" && Date.now() < cancelDeadline(order).getTime()

/**
 * cancel an order: put every item back in stock and give the coupon use back.
 * used by both the customer cancel and the admin status change.
 */
export const cancelOrder = async (order) => {
    // card orders: refund a paid one, or close its open payment page so it can't be paid later.
    // The refund happens first: if Stripe fails, the order is NOT canceled.
    if (order.paymentMethod === "card") {
        if (order.paymentStatus === "paid" && order.paymentIntentId) {
            const refund = await stripe().refunds.create({ payment_intent: order.paymentIntentId })
            order.paymentStatus = "refunded"
            order.refundId = refund.id
        } else if (order.paymentStatus === "unpaid" && order.stripeSessionId && process.env.STRIPE_SECRET_KEY) {
            await stripe().checkout.sessions.expire(order.stripeSessionId).catch(() => {}) // already expired / paid: ignore
        }
    }

    for (const item of order.products) {
        await productModel.updateOne(
            { _id: item.productId },
            [
                { $set: { stock: { $add: ["$stock", item.quantity] } } },
                { $set: { available: { $gt: ["$stock", 0] } } }
            ],
            { updatePipeline: true }
        )
    }
    // items are back in stock -> refresh cached lists and these product pages
    await catalogChanged(order.products.map((item) => item.productId))

    if (order.coupon?.couponId) {
        await couponModel.updateOne(
            { _id: order.coupon.couponId, usedCount: { $gt: 0 } },
            { $inc: { usedCount: -1 }, $pull: { usedBy: order.userId } }
        )
    }

    order.status = "canceled"
    await order.save()
    return order
}
