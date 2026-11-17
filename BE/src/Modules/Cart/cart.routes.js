import { Router } from "express";
import * as CC from "./cart.controller.js"
import { authuntication } from "../../MIddlewares/authentication.middle.js";
import { authorization } from "../../MIddlewares/authorization.middle.js";

const router=Router()

router.post("/add_to_cart",authuntication,authorization(["user"]),CC.add_to_cart)
router.delete("/delete_from_cart",authuntication,authorization(["user"]),CC.delete_item)
router.delete("/clear_cart", authuntication, authorization(["user"]), CC.clear_cart)
router.get("/get_cart", authuntication, authorization(["user"]), CC.get_cart)


export default router