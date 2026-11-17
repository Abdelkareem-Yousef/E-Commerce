import { Router } from "express";
import * as CC from "./coupon.controller.js"
import { authuntication } from "../../MIddlewares/authentication.middle.js";
import { authorization } from "../../MIddlewares/authorization.middle.js";

const router = Router()

router.get("/admin/coupons", authuntication, authorization(["admin"]), CC.list_coupons)
router.post("/admin/coupons", authuntication, authorization(["admin"]), CC.add_coupon)
router.patch("/admin/coupons/:id", authuntication, authorization(["admin"]), CC.update_coupon)
router.delete("/admin/coupons/:id", authuntication, authorization(["admin"]), CC.delete_coupon)

router.post("/apply_coupon", authuntication, authorization(["user"]), CC.apply_coupon)

export default router
