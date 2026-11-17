import { Router } from "express";
import * as AC from "./admin.controller.js"
import * as PC from "../product/product.controller.js"
import { authuntication } from "../../MIddlewares/authentication.middle.js";
import { authorization } from "../../MIddlewares/authorization.middle.js";

const router = Router()

router.get("/admin/stats", authuntication, authorization(["admin"]), AC.get_stats)
router.get("/admin/orders", authuntication, authorization(["admin"]), AC.get_all_orders)
router.patch("/admin/orders/:id", authuntication, authorization(["admin"]), AC.update_order_status)

router.get("/admin/products", authuntication, authorization(["admin"]), PC.admin_all_products)
router.patch("/admin/products/:id/visibility", authuntication, authorization(["admin"]), PC.set_visibility)

export default router
