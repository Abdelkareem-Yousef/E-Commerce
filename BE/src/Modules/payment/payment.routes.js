import { Router } from "express";
import * as PC from "./payment.controller.js"
import { authuntication } from "../../MIddlewares/authentication.middle.js";
import { authorization } from "../../MIddlewares/authorization.middle.js";

const router = Router()

router.post("/payment/checkout/:orderId", authuntication, authorization(["user"]), PC.pay_order)
router.get("/payment/verify", authuntication, authorization(["user"]), PC.verify_payment)
// the webhook route is registered in bootstrap.js, before express.json()

export default router
