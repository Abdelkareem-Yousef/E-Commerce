import { orderModel } from "../../DB/Models/order.model.js"
import { productModel } from "../../DB/Models/product.model.js"
import { userModel } from "../../DB/Models/user.model.js"
import { typeRoles } from "../../MIddlewares/authentication.middle.js"
import { cancelOrder } from "../Order/order.service.js"


// ---------- date range helpers (dates are read in the admin's time zone) ----------
const DAY = 24 * 60 * 60 * 1000

const safeZone = (tz) => {
    try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return tz } catch { return "UTC" }
}

// minutes the zone is ahead of UTC at a given moment
const zoneOffset = (date, tz) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
        timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).formatToParts(date).map((x) => [x.type, x.value]))
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
    return (asUTC - date.getTime()) / 60000
}

// "2026-11-17" -> the moment that day starts in the zone
const startOfDay = (ymd, tz) => {
    const [y, m, d] = ymd.split("-").map(Number)
    const guess = Date.UTC(y, m - 1, d)
    let t = guess - zoneOffset(new Date(guess), tz) * 60000
    t = guess - zoneOffset(new Date(t), tz) * 60000   // second pass for DST days
    return new Date(t)
}

const dayKey = (date, tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date) // YYYY-MM-DD
const isYmd = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v))

/*
GET /admin/stats?from=2026-11-01&to=2026-11-17&tz=Africa/Cairo
  from / to : days (both included). Default: the last 7 days.
  tz        : the admin's time zone, so "a day" means their day. Default: Africa/Cairo.
Revenue, orders, items sold, statuses, top products, recent orders and the chart follow the range.
Total customers / products / all-time orders and low stock do not.
*/
const get_stats = async (req, res, next) => {
    try {
        const tz = safeZone(req.query.tz || "Africa/Cairo")
        const todayKey = dayKey(new Date(), tz)
        let toKey = isYmd(req.query.to) ? req.query.to : todayKey
        let fromKey = isYmd(req.query.from)
            ? req.query.from
            : dayKey(new Date(startOfDay(toKey, tz).getTime() - 6 * DAY + 12 * 3600000), tz)
        if (fromKey > toKey) [fromKey, toKey] = [toKey, fromKey]

        const from = startOfDay(fromKey, tz)
        const nextDay = dayKey(new Date(startOfDay(toKey, tz).getTime() + 36 * 3600000), tz)
        const to = new Date(startOfDay(nextDay, tz).getTime() - 1)      // end of the "to" day

        const days = Math.round((startOfDay(nextDay, tz) - from) / DAY)
        if (days > 731) return res.status(400).json({ message: "choose a range of 2 years or less" })
        const byMonth = days > 62                                        // long ranges: one bar per month
        const format = byMonth ? "%Y-%m" : "%Y-%m-%d"

        const inRange = { createdAt: { $gte: from, $lte: to } }
        const sold = { ...inRange, status: { $ne: "canceled" } }

        const [totalUsers, newCustomers, totalProducts, totalOrders, ordersInRange, statusAgg, lowStock, recentOrders, salesAgg, discounts] =
            await Promise.all([
                userModel.countDocuments({ role: typeRoles.user }),
                userModel.countDocuments({ role: typeRoles.user, ...inRange }),
                productModel.countDocuments(),
                orderModel.countDocuments(),
                orderModel.countDocuments(inRange),
                orderModel.aggregate([{ $match: inRange }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
                productModel.find({ stock: { $lte: 5 } }).sort({ stock: 1 }).limit(5)
                    .select("name stock price image"),
                orderModel.find(inRange).sort({ createdAt: -1 }).limit(5)
                    .populate("userId", "name email")
                    .populate("products.productId", "name price"),
                orderModel.aggregate([
                    { $match: sold },
                    { $unwind: "$products" },
                    { $lookup: { from: "products", localField: "products.productId", foreignField: "_id", as: "p" } },
                    { $unwind: { path: "$p", preserveNullAndEmptyArrays: true } },
                    // use the price saved in the order, or the current product price for old orders
                    { $addFields: { lineTotal: { $multiply: ["$products.quantity",
                        { $ifNull: ["$products.price", { $ifNull: ["$p.price", 0] }] }] } } },
                    { $facet: {
                        total: [{ $group: { _id: null, revenue: { $sum: "$lineTotal" }, itemsSold: { $sum: "$products.quantity" },
                            orders: { $addToSet: "$_id" } } }],
                        buckets: [
                            { $group: {
                                _id: { $dateToString: { format, date: "$createdAt", timezone: tz } },
                                revenue: { $sum: "$lineTotal" },
                                orders: { $addToSet: "$_id" }
                            } },
                            { $project: { revenue: 1, orders: { $size: "$orders" } } }
                        ],
                        top: [
                            { $group: { _id: "$products.productId", name: { $first: "$p.name" },
                                sold: { $sum: "$products.quantity" }, revenue: { $sum: "$lineTotal" } } },
                            { $sort: { sold: -1 } },
                            { $limit: 5 }
                        ]
                    } }
                ]),
                // coupons: subtract each order's discount from revenue
                orderModel.aggregate([
                    { $match: { ...sold, discount: { $gt: 0 } } },
                    { $facet: {
                        total: [{ $group: { _id: null, sum: { $sum: "$discount" } } }],
                        buckets: [{ $group: { _id: { $dateToString: { format, date: "$createdAt", timezone: tz } }, sum: { $sum: "$discount" } } }]
                    } }
                ])
            ])

        const ordersByStatus = { pending: 0, completed: 0, canceled: 0 }
        for (const s of statusAgg) ordersByStatus[s._id] = s.count

        const salesData = salesAgg[0] ?? { total: [], buckets: [], top: [] }
        const totalDiscount = discounts[0]?.total[0]?.sum ?? 0
        const bucketDiscount = new Map((discounts[0]?.buckets ?? []).map((d) => [d._id, d.sum]))
        const bucketMap = new Map(salesData.buckets.map((d) => [d._id, d]))

        // every day (or month) in the range, with 0 where there were no orders
        const keys = []
        if (byMonth) {
            let [y, m] = fromKey.split("-").map(Number)
            const [ty, tm] = toKey.split("-").map(Number)
            while (y < ty || (y === ty && m <= tm)) {
                keys.push(`${y}-${String(m).padStart(2, "0")}`)
                if (++m > 12) { m = 1; y++ }
            }
        } else {
            for (let t = from.getTime() + 12 * 3600000; t <= to.getTime(); t += DAY) {
                const k = dayKey(new Date(t), tz)
                if (keys[keys.length - 1] !== k) keys.push(k)
            }
        }
        const sales = keys.map((key) => {
            const gross = bucketMap.get(key)?.revenue ?? 0
            return { date: key, revenue: Math.max(0, gross - (bucketDiscount.get(key) ?? 0)), orders: bucketMap.get(key)?.orders ?? 0 }
        })

        const revenue = Math.max(0, (salesData.total[0]?.revenue ?? 0) - totalDiscount)
        const soldOrders = salesData.total[0]?.orders?.length ?? 0

        res.json({
            message: "dashboard stats",
            stats: {
                range: { from: fromKey, to: toKey, tz, days, granularity: byMonth ? "month" : "day" },
                // follow the range
                revenue,
                discounts: totalDiscount,
                itemsSold: salesData.total[0]?.itemsSold ?? 0,
                ordersInRange,
                averageOrder: soldOrders ? Math.round((revenue / soldOrders) * 100) / 100 : 0,
                newCustomers,
                ordersByStatus,
                sales,
                topProducts: salesData.top.map((t) => ({ _id: t._id, name: t.name ?? "deleted product", sold: t.sold, revenue: t.revenue })),
                recentOrders,
                // all time
                totalUsers,
                totalProducts,
                totalOrders,
                lowStock
            }
        })
    } catch (error) {
        return next(error)
    }
}


// GET /admin/orders
const get_all_orders = async (req, res, next) => {
    try {
        const orders = await orderModel.find().sort({ createdAt: -1 })
            .populate("userId", "name email")
            .populate("products.productId", "name price image")
        res.json({ message: "all orders", orders })
    } catch (error) {
        return next(error)
    }
}


// PATCH /admin/orders/:id   body: { status }
const update_order_status = async (req, res, next) => {
    try {
        const { status } = req.body
        if (!["pending", "completed", "canceled"].includes(status)) {
            return res.status(400).json({ message: "invalid status" })
        }

        const order = await orderModel.findById(req.params.id)
        if (!order) return res.status(404).json({ message: "order not found" })

        if (order.status === "canceled" && status !== "canceled") {
            return res.status(400).json({ message: "a canceled order can't be reopened" })
        }

        // canceling puts the items back in stock and gives the coupon use back
        if (status === "canceled") {
            if (order.status !== "canceled") {
                try {
                    await cancelOrder(order)   // paid card orders are refunded on Stripe first
                } catch (err) {
                    return res.status(502).json({ message: `couldn't refund the card payment: ${err.message}` })
                }
            }
            return res.json({ message: "order status updated", order })
        }

        order.status = status
        // cash on delivery: money is collected when the order is delivered
        if (status === "completed" && order.paymentMethod === "cash") order.paymentStatus = "paid"
        await order.save()
        res.json({ message: "order status updated", order })
    } catch (error) {
        return next(error)
    }
}

export {
    get_stats,
    get_all_orders,
    update_order_status
}
