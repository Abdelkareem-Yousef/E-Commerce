import { Router } from "express";
import * as OC from "./order.controller.js"
import { authorization } from './../../MIddlewares/authorization.middle.js';
import { authuntication } from "../../MIddlewares/authentication.middle.js";


const router=Router()

router.post("/make_order",authuntication,authorization(["user"]),OC.make_order)
router.get("/my_orders",authuntication,authorization(["user"]),OC.my_orders)
router.patch("/my_orders/:id/cancel",authuntication,authorization(["user"]),OC.cancel_my_order)

export default router