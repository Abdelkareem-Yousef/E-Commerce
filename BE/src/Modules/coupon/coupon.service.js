import { couponModel } from "../../DB/Models/coupon.model.js"

// throws an Error with a user-friendly message, or returns { coupon, discount }
export const checkCoupon = async (code, userId, subtotal) => {
    const fail = (message) => { const e = new Error(message); e.status = 400; throw e }

    if (!code) fail("enter a coupon code")
    const coupon = await couponModel.findOne({ code: String(code).trim().toUpperCase() })

    if (!coupon || !coupon.active) fail("this coupon is not valid")
    if (coupon.expiresAt && coupon.expiresAt < new Date()) fail("this coupon has expired")
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) fail("this coupon has reached its usage limit")
    if (coupon.onePerUser && coupon.usedBy.some((id) => id.toString() === userId.toString())) {
        fail("you have already used this coupon")
    }
    if (subtotal < (coupon.minOrder ?? 0)) fail(`this coupon needs an order of at least ${coupon.minOrder}`)

    let discount = coupon.type === "percent" ? (subtotal * coupon.value) / 100 : coupon.value
    if (coupon.type === "percent" && coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount)
    discount = Math.min(discount, subtotal)               // never below 0
    discount = Math.round(discount * 100) / 100

    return { coupon, discount }
}

// call after the order is created
export const markCouponUsed = (coupon, userId) =>
    couponModel.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 }, $addToSet: { usedBy: userId } })
