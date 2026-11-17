import { couponModel } from "../../DB/Models/coupon.model.js"
import { cartModel } from "../../DB/Models/cart.model.js"
import { checkCoupon } from "./coupon.service.js"

const pick = (body) => {
    const data = {}
    for (const k of ["code", "type", "value", "maxDiscount", "minOrder", "expiresAt", "usageLimit", "onePerUser", "active"]) {
        if (body[k] !== undefined) data[k] = body[k] === "" ? null : body[k]
    }
    if (data.type === "percent" && data.value > 100) data.value = 100
    return data
}

// ---------- admin ----------

const list_coupons = async (req, res, next) => {
    try {
        const coupons = await couponModel.find().sort({ createdAt: -1 }).select("-usedBy")
        res.json({ message: "coupons", coupons })
    } catch (error) {
        return next(error)
    }
}

const add_coupon = async (req, res, next) => {
    try {
        const data = pick(req.body)
        if (!data.code || data.value === undefined || data.value === null) {
            return res.status(400).json({ message: "code and value are required" })
        }
        const coupon = await couponModel.create(data)
        res.status(201).json({ message: "coupon created", coupon })
    } catch (error) {
        return next(error)
    }
}

const update_coupon = async (req, res, next) => {
    try {
        const coupon = await couponModel.findByIdAndUpdate(req.params.id, pick(req.body), { returnDocument: "after", runValidators: true })
            .select("-usedBy")
        if (!coupon) return res.status(404).json({ message: "coupon not found" })
        res.json({ message: "coupon updated", coupon })
    } catch (error) {
        return next(error)
    }
}

const delete_coupon = async (req, res, next) => {
    try {
        const coupon = await couponModel.findByIdAndDelete(req.params.id)
        if (!coupon) return res.status(404).json({ message: "coupon not found" })
        res.json({ message: "coupon deleted" })
    } catch (error) {
        return next(error)
    }
}

// ---------- user ----------

// POST /apply_coupon  body: { code }  -> how much the coupon takes off the current cart
const apply_coupon = async (req, res, next) => {
    try {
        const cart = await cartModel.findOne({ userId: req.user._id }).populate("products.productId", "price")
        const subtotal = (cart?.products ?? [])
            .filter((i) => i.productId)
            .reduce((s, i) => s + i.productId.price * i.quantity, 0)

        const { coupon, discount } = await checkCoupon(req.body.code, req.user._id, subtotal)
        res.json({
            message: "coupon applied",
            coupon: { code: coupon.code, type: coupon.type, value: coupon.value },
            subtotal,
            discount,
            total: Math.round((subtotal - discount) * 100) / 100
        })
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message })
        return next(error)
    }
}

export { list_coupons, add_coupon, update_coupon, delete_coupon, apply_coupon }
