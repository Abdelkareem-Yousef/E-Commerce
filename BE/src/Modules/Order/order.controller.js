import { cartModel } from "../../DB/Models/cart.model.js"
import { orderModel } from "../../DB/Models/order.model.js"
import { productModel } from "../../DB/Models/product.model.js"
import { checkCoupon, markCouponUsed } from "../coupon/coupon.service.js"
import { CANCEL_WINDOW_HOURS, cancelDeadline, canCustomerCancel, cancelOrder } from "./order.service.js"
import { createCheckoutSession } from "../payment/payment.service.js"
import { cleanAddress, validateAddress } from "../user/user.controller.js"
import { catalogChanged } from "../../Services/cache.js"


const money = (n) => Math.round(n * 100) / 100

const addressLine = (a) =>
    [a.street, a.building, a.area, a.city].filter(Boolean).join(", ") + (a.notes ? ` (${a.notes})` : "")

// undo stock we already subtracted
const restoreStock = async (lines) => {
    if (!lines.length) return
    for (const done of lines) {
        await productModel.updateOne(
            { _id: done.productId },
            [
                { $set: { stock: { $add: ["$stock", done.quantity] } } },
                { $set: { available: { $gt: ["$stock", 0] } } }
            ],{ updatePipeline: true}
        );
    }
    await catalogChanged(lines.map((l) => l.productId))   // stock is back -> refresh cached pages
}

/*
POST /make_order
body: {
    addressId: "<saved address id>"            -- OR --
    address: { label, phone, city, area, street, building, notes }, saveAddress: true/false
    paymentMethod: "cash" | "card",
    couponCode: "SALE10"                        (optional)
}
*/
const make_order=async(req,res,next)=>{
    try {
        const user = req.user
        const { addressId, address: newAddress, saveAddress, couponCode } = req.body ?? {}
        const paymentMethod = req.body?.paymentMethod ?? "cash"

        if(!["cash","card"].includes(paymentMethod)){
            return res.status(400).json({message:"choose cash on delivery or card"})
        }

        // ---- 1) the delivery address ----
        let shipping
        if (addressId) {
            shipping = user.addresses.id(addressId)
            if (!shipping) return res.status(400).json({ message: "saved address not found" })
            shipping = shipping.toObject()
        } else if (newAddress) {
            shipping = cleanAddress(newAddress)
            const problem = validateAddress(shipping)
            if (problem) return res.status(400).json({ message: problem })
        } else {
            return res.status(400).json({ message: "choose a delivery address" })
        }

        // ---- 2) the cart ----
        const cart = await cartModel.findOne({userId:user._id}).populate("products.productId")
        const lines = (cart?.products ?? []).filter((i) => i.productId)
        if(!lines.length){
            return res.status(400).json({message:"add items to cart first"})
        }
        const hidden = lines.find((i) => i.productId.visible === false)
        if (hidden) {
            return res.status(400).json({ message: `"${hidden.productId.name}" is no longer available, remove it from your cart` })
        }

        // ---- 3) coupon (checked before touching stock) ----
        const subtotal = money(lines.reduce((s, i) => s + i.productId.price * i.quantity, 0))
        let coupon = null, discount = 0
        if (couponCode) {
            try {
                ({ coupon, discount } = await checkCoupon(couponCode, user._id, subtotal))
            } catch (err) {
                return res.status(400).json({ message: err.message })
            }
        }

        // ---- 4) take the items out of stock ----
        const reduced = []
        const items = []
        for (const item of lines) {
            const updated = await productModel.findOneAndUpdate(
                { _id: item.productId._id, stock: { $gte: item.quantity }, visible: { $ne: false } },
                [
                    { $set: { stock: { $subtract: ["$stock", item.quantity] } } },
                    { $set: { available: { $gt: ["$stock", 0] } } },
                ],
                { returnDocument: "after", updatePipeline: true }
            );

            if (!updated) {
                await restoreStock(reduced)
                return res.status(400).json({
                    message: `not enough stock for "${item.productId.name}"`,
                    productId: item.productId._id,
                });
            }

            reduced.push({ productId: updated._id, quantity: item.quantity });
            items.push({ productId: updated._id, quantity: item.quantity, price: updated.price });
        }
        // stock went down -> cached lists / product pages are out of date
        await catalogChanged(reduced.map((r) => r.productId))

        // ---- 5) create the order ----
        let order
        try {
            order = await orderModel.create({
                products: items,
                userId: user._id,
                phone: shipping.phone,
                address: addressLine(shipping),
                shippingAddress: {
                    label: shipping.label, city: shipping.city, area: shipping.area,
                    street: shipping.street, building: shipping.building, notes: shipping.notes
                },
                paymentMethod,
                paymentStatus: "unpaid",   // cash: paid on delivery | card: paid on the Stripe page
                subtotal,
                discount,
                total: money(subtotal - discount),
                coupon: coupon ? { code: coupon.code, couponId: coupon._id } : undefined
            })
        } catch (err) {
            await restoreStock(reduced)
            throw err
        }

        if (coupon) await markCouponUsed(coupon, user._id)

        // card: open a Stripe payment page. If Stripe fails, undo the order (stock + coupon) and keep the cart.
        let checkoutUrl = null
        if (paymentMethod === "card") {
            try {
                const session = await createCheckoutSession(order, user)
                checkoutUrl = session.url
            } catch (err) {
                await cancelOrder(order)
                return res.status(err.status ?? 502).json({
                    message: err.status ? err.message : "couldn't open the card payment page, please try again or choose cash on delivery"
                })
            }
        }

        // save the new address to the address book if asked
        if (newAddress && saveAddress && user.addresses.length < 10) {
            user.addresses.push({ ...shipping, isDefault: user.addresses.length === 0 })
            await user.save()
        }

        cart.products=[]
        await cart.save()

        res.status(201).json({message:"order is placed ",order,checkoutUrl})
    } catch (error) {
        return next(error)
    }
}

// GET /my_orders  -> orders of the logged in user (for the profile page)
const my_orders=async(req,res,next)=>{
    try {
        const orders = await orderModel.find({userId:req.user._id}).sort({createdAt:-1})
            .populate("products.productId","name price image")
        // tell the frontend until when each order can still be canceled
        const list = orders.map((o) => ({
            ...o.toObject(),
            cancelUntil: cancelDeadline(o),
            canCancel: canCustomerCancel(o)
        }))
        res.json({message:"your orders",orders:list,cancelWindowHours:CANCEL_WINDOW_HOURS})
    } catch (error) {
        return next(error)
    }
}

// PATCH /my_orders/:id/cancel  -> customer cancels their own order (pending, within the time window)
const cancel_my_order=async(req,res,next)=>{
    try {
        const order = await orderModel.findOne({ _id: req.params.id, userId: req.user._id })
        if (!order) return res.status(404).json({ message: "order not found" })

        if (order.status === "canceled") return res.status(400).json({ message: "this order is already canceled" })
        if (order.status !== "pending") return res.status(400).json({ message: "this order can't be canceled anymore" })
        if (!canCustomerCancel(order)) {
            return res.status(400).json({
                message: `orders can only be canceled within ${CANCEL_WINDOW_HOURS} hours of placing them`
            })
        }

        try {
            await cancelOrder(order)
        } catch (err) {
            return res.status(502).json({ message: "we couldn't refund your card right now, please try again in a minute" })
        }
        await order.populate("products.productId","name price image")
        res.json({
            message: order.paymentStatus === "refunded" ? "your order was canceled and your card refunded" : "your order was canceled",
            order: { ...order.toObject(), cancelUntil: cancelDeadline(order), canCancel: false }
        })
    } catch (error) {
        return next(error)
    }
}

export{
    make_order,
    my_orders,
    cancel_my_order
}